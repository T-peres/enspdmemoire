-- =====================================================
-- Migration: Corrections pour le planificateur de soutenances
-- Description: Corriger les incohérences et ajouter les fonctionnalités manquantes
-- Date: 2025-12-01
-- =====================================================

-- ===== CORRECTION 1: Renommer 'defenses' en 'defense_sessions' dans les vues =====

-- Créer une vue pour compatibilité avec l'ancien code (si nécessaire)
CREATE OR REPLACE VIEW defenses AS
SELECT * FROM defense_sessions;

COMMENT ON VIEW defenses IS 'Vue de compatibilité - utiliser defense_sessions à la place';


-- ===== CORRECTION 2: Ajouter les contraintes manquantes =====

-- S'assurer qu'une soutenance ne peut pas être planifiée si l'étudiant n'a pas terminé les prérequis
CREATE OR REPLACE FUNCTION validate_defense_prerequisites()
RETURNS TRIGGER AS $$
DECLARE
  v_eligibility JSONB;
BEGIN
  -- Vérifier l'éligibilité de l'étudiant
  SELECT check_final_submission_eligibility(NEW.student_id) INTO v_eligibility;
  
  -- Si pas éligible et statut = scheduled, bloquer
  IF NEW.status = 'scheduled' AND NOT (v_eligibility->>'eligible')::BOOLEAN THEN
    RAISE EXCEPTION 'L''étudiant n''est pas éligible pour une soutenance. Vérifications: %', 
      v_eligibility->'checks';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_defense_prerequisites ON defense_sessions;
CREATE TRIGGER trigger_validate_defense_prerequisites
  BEFORE INSERT OR UPDATE ON defense_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'scheduled')
  EXECUTE FUNCTION validate_defense_prerequisites();


-- ===== CORRECTION 3: Gestion des conflits de salles et horaires =====

-- Fonction pour vérifier les conflits de salle
CREATE OR REPLACE FUNCTION check_room_conflicts(
  p_location TEXT,
  p_defense_date TIMESTAMPTZ,
  p_duration_minutes INTEGER,
  p_exclude_defense_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_conflict BOOLEAN;
  v_end_time TIMESTAMPTZ;
BEGIN
  v_end_time := p_defense_date + (p_duration_minutes || ' minutes')::INTERVAL;
  
  SELECT EXISTS (
    SELECT 1 FROM defense_sessions
    WHERE location = p_location
      AND status IN ('scheduled', 'in_progress')
      AND (p_exclude_defense_id IS NULL OR id != p_exclude_defense_id)
      AND (
        -- Chevauchement de début
        (defense_date <= p_defense_date AND 
         defense_date + (duration_minutes || ' minutes')::INTERVAL > p_defense_date)
        OR
        -- Chevauchement de fin
        (defense_date < v_end_time AND 
         defense_date + (duration_minutes || ' minutes')::INTERVAL >= v_end_time)
        OR
        -- Englobe complètement
        (defense_date >= p_defense_date AND 
         defense_date + (duration_minutes || ' minutes')::INTERVAL <= v_end_time)
      )
  ) INTO v_has_conflict;
  
  RETURN v_has_conflict;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier les conflits de jury
CREATE OR REPLACE FUNCTION check_jury_conflicts(
  p_defense_session_id UUID,
  p_defense_date TIMESTAMPTZ,
  p_duration_minutes INTEGER
)
RETURNS TABLE(
  jury_member_id UUID,
  jury_member_name TEXT,
  conflicting_defense_id UUID
) AS $$
DECLARE
  v_end_time TIMESTAMPTZ;
BEGIN
  v_end_time := p_defense_date + (p_duration_minutes || ' minutes')::INTERVAL;
  
  RETURN QUERY
  SELECT DISTINCT
    djm.jury_member_id,
    p.first_name || ' ' || p.last_name AS jury_member_name,
    ds.id AS conflicting_defense_id
  FROM defense_jury_members djm
  JOIN defense_sessions ds ON ds.id = djm.defense_session_id
  JOIN profiles p ON p.id = djm.jury_member_id
  WHERE djm.defense_session_id = p_defense_session_id
    AND ds.id != p_defense_session_id
    AND ds.status IN ('scheduled', 'in_progress')
    AND (
      (ds.defense_date <= p_defense_date AND 
       ds.defense_date + (ds.duration_minutes || ' minutes')::INTERVAL > p_defense_date)
      OR
      (ds.defense_date < v_end_time AND 
       ds.defense_date + (ds.duration_minutes || ' minutes')::INTERVAL >= v_end_time)
      OR
      (ds.defense_date >= p_defense_date AND 
       ds.defense_date + (ds.duration_minutes || ' minutes')::INTERVAL <= v_end_time)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour vérifier les conflits avant insertion/mise à jour
CREATE OR REPLACE FUNCTION validate_defense_scheduling()
RETURNS TRIGGER AS $$
DECLARE
  v_has_room_conflict BOOLEAN;
  v_jury_conflicts INTEGER;
BEGIN
  -- Vérifier les conflits de salle
  IF NEW.location IS NOT NULL THEN
    SELECT check_room_conflicts(
      NEW.location, 
      NEW.defense_date, 
      NEW.duration_minutes,
      NEW.id
    ) INTO v_has_room_conflict;
    
    IF v_has_room_conflict THEN
      RAISE EXCEPTION 'Conflit de salle: la salle % est déjà réservée à cette date/heure', NEW.location;
    END IF;
  END IF;
  
  -- Vérifier les conflits de jury (seulement si des membres sont déjà assignés)
  IF TG_OP = 'UPDATE' THEN
    SELECT COUNT(*) INTO v_jury_conflicts
    FROM check_jury_conflicts(NEW.id, NEW.defense_date, NEW.duration_minutes);
    
    IF v_jury_conflicts > 0 THEN
      RAISE WARNING 'Attention: % membre(s) du jury ont un conflit d''horaire', v_jury_conflicts;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_defense_scheduling ON defense_sessions;
CREATE TRIGGER trigger_validate_defense_scheduling
  BEFORE INSERT OR UPDATE ON defense_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'scheduled')
  EXECUTE FUNCTION validate_defense_scheduling();


-- ===== CORRECTION 4: Fonctions helper pour le planificateur =====

-- Fonction pour obtenir les créneaux disponibles
CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_location TEXT,
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  is_available BOOLEAN
) AS $$
DECLARE
  v_start_hour INTEGER := 8;  -- 8h du matin
  v_end_hour INTEGER := 18;   -- 18h
  v_current_time TIMESTAMPTZ;
  v_slot_end TIMESTAMPTZ;
BEGIN
  -- Générer les créneaux de 30 minutes
  FOR i IN 0..(v_end_hour - v_start_hour) * 2 - 1 LOOP
    v_current_time := p_date + (v_start_hour || ' hours')::INTERVAL + (i * 30 || ' minutes')::INTERVAL;
    v_slot_end := v_current_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Vérifier si le créneau est disponible
    RETURN QUERY
    SELECT 
      v_current_time,
      v_slot_end,
      NOT check_room_conflicts(p_location, v_current_time, p_duration_minutes);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les salles disponibles
CREATE OR REPLACE FUNCTION get_available_rooms(
  p_defense_date TIMESTAMPTZ,
  p_duration_minutes INTEGER DEFAULT 60,
  p_department_id UUID DEFAULT NULL
)
RETURNS TABLE(
  location TEXT,
  capacity INTEGER,
  is_available BOOLEAN
) AS $$
BEGIN
  -- Cette fonction suppose l'existence d'une table 'rooms' (à créer si nécessaire)
  -- Pour l'instant, retourner les salles utilisées précédemment
  RETURN QUERY
  SELECT DISTINCT
    ds.location,
    NULL::INTEGER AS capacity,
    NOT check_room_conflicts(ds.location, p_defense_date, p_duration_minutes) AS is_available
  FROM defense_sessions ds
  WHERE ds.location IS NOT NULL
    AND (p_department_id IS NULL OR ds.department_id = p_department_id)
  ORDER BY ds.location;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les membres du jury disponibles
CREATE OR REPLACE FUNCTION get_available_jury_members(
  p_defense_date TIMESTAMPTZ,
  p_duration_minutes INTEGER,
  p_department_id UUID
)
RETURNS TABLE(
  jury_member_id UUID,
  jury_member_name TEXT,
  role_type TEXT,
  total_defenses INTEGER,
  is_available BOOLEAN
) AS $$
DECLARE
  v_end_time TIMESTAMPTZ;
BEGIN
  v_end_time := p_defense_date + (p_duration_minutes || ' minutes')::INTERVAL;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name || ' ' || p.last_name AS jury_member_name,
    ur.role AS role_type,
    COUNT(djm.id)::INTEGER AS total_defenses,
    NOT EXISTS (
      SELECT 1 FROM defense_jury_members djm2
      JOIN defense_sessions ds2 ON ds2.id = djm2.defense_session_id
      WHERE djm2.jury_member_id = p.id
        AND ds2.status IN ('scheduled', 'in_progress')
        AND (
          (ds2.defense_date <= p_defense_date AND 
           ds2.defense_date + (ds2.duration_minutes || ' minutes')::INTERVAL > p_defense_date)
          OR
          (ds2.defense_date < v_end_time AND 
           ds2.defense_date + (ds2.duration_minutes || ' minutes')::INTERVAL >= v_end_time)
        )
    ) AS is_available
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN defense_jury_members djm ON djm.jury_member_id = p.id
  WHERE p.department_id = p_department_id
    AND ur.role IN ('supervisor', 'jury', 'department_head')
  GROUP BY p.id, p.first_name, p.last_name, ur.role
  ORDER BY total_defenses ASC, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== CORRECTION 5: Fonction pour planifier automatiquement une soutenance =====

CREATE OR REPLACE FUNCTION auto_schedule_defense(
  p_student_id UUID,
  p_preferred_date DATE DEFAULT NULL,
  p_preferred_location TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_department_id UUID;
  v_settings RECORD;
  v_available_slot RECORD;
  v_defense_id UUID;
  v_result JSONB;
BEGIN
  -- Récupérer le département de l'étudiant
  SELECT department_id INTO v_department_id
  FROM profiles
  WHERE id = p_student_id;
  
  -- Récupérer les paramètres du département
  SELECT * INTO v_settings
  FROM department_settings
  WHERE department_id = v_department_id;
  
  -- Trouver un créneau disponible
  IF p_preferred_date IS NOT NULL AND p_preferred_location IS NOT NULL THEN
    -- Vérifier si le créneau préféré est disponible
    IF NOT check_room_conflicts(
      p_preferred_location, 
      p_preferred_date::TIMESTAMPTZ, 
      v_settings.defense_duration_minutes
    ) THEN
      -- Créer la session de soutenance
      INSERT INTO defense_sessions (
        student_id,
        department_id,
        defense_date,
        location,
        duration_minutes,
        status
      ) VALUES (
        p_student_id,
        v_department_id,
        p_preferred_date::TIMESTAMPTZ,
        p_preferred_location,
        v_settings.defense_duration_minutes,
        'scheduled'
      )
      RETURNING id INTO v_defense_id;
      
      v_result := jsonb_build_object(
        'success', TRUE,
        'defense_id', v_defense_id,
        'defense_date', p_preferred_date,
        'location', p_preferred_location
      );
    ELSE
      v_result := jsonb_build_object(
        'success', FALSE,
        'error', 'Le créneau préféré n''est pas disponible'
      );
    END IF;
  ELSE
    v_result := jsonb_build_object(
      'success', FALSE,
      'error', 'Date et lieu requis pour la planification automatique'
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== CORRECTION 6: Fonction pour obtenir le calendrier des soutenances =====

CREATE OR REPLACE FUNCTION get_defense_calendar(
  p_department_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  defense_id UUID,
  defense_date TIMESTAMPTZ,
  duration_minutes INTEGER,
  location TEXT,
  student_name TEXT,
  thesis_title TEXT,
  status TEXT,
  jury_members JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.defense_date,
    ds.duration_minutes,
    ds.location,
    p.first_name || ' ' || p.last_name AS student_name,
    t.title AS thesis_title,
    ds.status,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', djm.jury_member_id,
          'name', pj.first_name || ' ' || pj.last_name,
          'role', djm.role
        )
      )
      FROM defense_jury_members djm
      JOIN profiles pj ON pj.id = djm.jury_member_id
      WHERE djm.defense_session_id = ds.id
    ) AS jury_members
  FROM defense_sessions ds
  JOIN profiles p ON p.id = ds.student_id
  LEFT JOIN themes t ON t.student_id = ds.student_id AND t.status = 'approved'
  WHERE ds.department_id = p_department_id
    AND ds.defense_date::DATE BETWEEN p_start_date AND p_end_date
  ORDER BY ds.defense_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires
COMMENT ON FUNCTION check_room_conflicts IS 'Vérifie les conflits de salle pour une date/heure donnée';
COMMENT ON FUNCTION check_jury_conflicts IS 'Vérifie les conflits d''horaire pour les membres du jury';
COMMENT ON FUNCTION get_available_time_slots IS 'Retourne les créneaux horaires disponibles pour une salle';
COMMENT ON FUNCTION get_available_rooms IS 'Retourne les salles disponibles pour une date/heure';
COMMENT ON FUNCTION get_available_jury_members IS 'Retourne les membres du jury disponibles';
COMMENT ON FUNCTION auto_schedule_defense IS 'Planifie automatiquement une soutenance';
COMMENT ON FUNCTION get_defense_calendar IS 'Retourne le calendrier des soutenances pour un département';

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Pour annuler cette migration, exécuter:
/*
DROP FUNCTION IF EXISTS get_defense_calendar(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS auto_schedule_defense(UUID, DATE, TEXT);
DROP FUNCTION IF EXISTS get_available_jury_members(TIMESTAMPTZ, INTEGER, UUID);
DROP FUNCTION IF EXISTS get_available_rooms(TIMESTAMPTZ, INTEGER, UUID);
DROP FUNCTION IF EXISTS get_available_time_slots(TEXT, DATE, INTEGER);
DROP TRIGGER IF EXISTS trigger_validate_defense_scheduling ON defense_sessions;
DROP FUNCTION IF EXISTS validate_defense_scheduling();
DROP FUNCTION IF EXISTS check_jury_conflicts(UUID, TIMESTAMPTZ, INTEGER);
DROP FUNCTION IF EXISTS check_room_conflicts(TEXT, TIMESTAMPTZ, INTEGER, UUID);
DROP TRIGGER IF EXISTS trigger_validate_defense_prerequisites ON defense_sessions;
DROP FUNCTION IF EXISTS validate_defense_prerequisites();
DROP VIEW IF EXISTS defenses;
*/
