-- =====================================================
-- Migration: Création des triggers d'alertes automatiques
-- Description: Triggers pour générer automatiquement des alertes sur événements clés
-- Date: 2025-12-01
-- =====================================================

-- ===== TRIGGER 1: Alerte deadline approchant =====
CREATE OR REPLACE FUNCTION trigger_deadline_alert()
RETURNS void AS $$
DECLARE
  v_student RECORD;
  v_settings RECORD;
  v_days_remaining INTEGER;
BEGIN
  FOR v_student IN 
    SELECT p.id, p.first_name, p.last_name, p.department_id
    FROM profiles p
    WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = 'student')
  LOOP
    -- Récupérer les paramètres du département
    SELECT * INTO v_settings 
    FROM department_settings 
    WHERE department_id = v_student.department_id;
    
    IF v_settings.report_submission_end_date IS NOT NULL THEN
      v_days_remaining := v_settings.report_submission_end_date - CURRENT_DATE;
      
      -- Alerte si moins de 7 jours restants
      IF v_days_remaining > 0 AND v_days_remaining <= v_settings.deadline_reminder_days THEN
        -- Vérifier si l'alerte n'existe pas déjà
        IF NOT EXISTS (
          SELECT 1 FROM alerts
          WHERE user_id = v_student.id
            AND alert_type = 'deadline_approaching'
            AND dismissed = FALSE
            AND created_at > CURRENT_DATE - INTERVAL '1 day'
        ) THEN
          INSERT INTO alerts (user_id, alert_type, severity, title, message, expires_at)
          VALUES (
            v_student.id,
            'deadline_approaching',
            CASE 
              WHEN v_days_remaining <= 3 THEN 'error'
              WHEN v_days_remaining <= 7 THEN 'warning'
              ELSE 'info'
            END,
            'Deadline Approchant',
            'Il vous reste ' || v_days_remaining || ' jour(s) pour soumettre votre version finale.',
            v_settings.report_submission_end_date + INTERVAL '1 day'
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== TRIGGER 2: Alerte document rejeté =====
CREATE OR REPLACE FUNCTION trigger_document_rejected_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO alerts (
      user_id, alert_type, severity, title, message,
      related_entity_type, related_entity_id
    ) VALUES (
      NEW.student_id,
      'document_rejected',
      'warning',
      'Document Rejeté',
      'Votre document "' || NEW.title || '" a été rejeté. Raison: ' || COALESCE(NEW.rejection_reason, 'Non spécifiée'),
      'document',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_document_rejected_alert ON documents;
CREATE TRIGGER trigger_document_rejected_alert
  AFTER UPDATE ON documents
  FOR EACH ROW
  WHEN (NEW.status = 'rejected' AND OLD.status != 'rejected')
  EXECUTE FUNCTION trigger_document_rejected_alert();


-- ===== TRIGGER 3: Alerte soutenance planifiée =====
DO $$
BEGIN
  -- Vérifier si la table defense_sessions existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_sessions'
  ) THEN
    -- Créer la fonction
    CREATE OR REPLACE FUNCTION trigger_defense_scheduled_alert()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_student_name TEXT;
    BEGIN
      IF NEW.status = 'scheduled' AND (OLD.status IS NULL OR OLD.status != 'scheduled') THEN
        -- Alerte pour l'étudiant
        INSERT INTO alerts (
          user_id, alert_type, severity, title, message,
          related_entity_type, related_entity_id
        ) VALUES (
          NEW.student_id,
          'defense_scheduled',
          'info',
          'Soutenance Planifiée',
          'Votre soutenance a été planifiée pour le ' || 
          TO_CHAR(NEW.defense_date, 'DD/MM/YYYY à HH24:MI') || 
          ' en salle ' || COALESCE(NEW.location, 'à définir'),
          'defense',
          NEW.id
        );
        
        -- Alerte pour les membres du jury (si la table existe)
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'defense_jury_members'
        ) THEN
          SELECT first_name || ' ' || last_name INTO v_student_name
          FROM profiles WHERE id = NEW.student_id;
          
          INSERT INTO alerts (
            user_id, alert_type, severity, title, message,
            related_entity_type, related_entity_id
          )
          SELECT 
            djm.jury_member_id,
            'defense_scheduled',
            'info',
            'Nouvelle Soutenance',
            'Vous êtes membre du jury pour la soutenance de ' || v_student_name || 
            ' le ' || TO_CHAR(NEW.defense_date, 'DD/MM/YYYY à HH24:MI'),
            'defense',
            NEW.id
          FROM defense_jury_members djm
          WHERE djm.defense_session_id = NEW.id;
        END IF;
      END IF;
      
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    -- Créer le trigger
    DROP TRIGGER IF EXISTS trigger_defense_scheduled_alert ON defense_sessions;
    CREATE TRIGGER trigger_defense_scheduled_alert
      AFTER INSERT OR UPDATE ON defense_sessions
      FOR EACH ROW
      EXECUTE FUNCTION trigger_defense_scheduled_alert();
    
    RAISE NOTICE '✅ Trigger defense_scheduled_alert créé sur defense_sessions';
  ELSE
    RAISE WARNING '⚠️ Table defense_sessions non trouvée - trigger non créé';
  END IF;
END $$;


-- ===== TRIGGER 4: Alerte validation requise =====
CREATE OR REPLACE FUNCTION trigger_validation_required_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Alerte pour l'encadreur quand un document est soumis
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending') THEN
    INSERT INTO alerts (
      user_id, alert_type, severity, title, message,
      related_entity_type, related_entity_id
    ) VALUES (
      NEW.supervisor_id,
      'validation_required',
      'warning',
      'Validation Requise',
      'Un nouveau document nécessite votre validation: "' || NEW.title || '"',
      'document',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validation_required_alert ON documents;
CREATE TRIGGER trigger_validation_required_alert
  AFTER INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_validation_required_alert();


-- ===== TRIGGER 5: Alerte plagiat échoué =====
CREATE OR REPLACE FUNCTION trigger_plagiarism_failed_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id UUID;
  v_threshold DECIMAL;
BEGIN
  IF NEW.passed = FALSE AND (OLD.passed IS NULL OR OLD.passed = TRUE) THEN
    -- Récupérer l'étudiant via report_submission
    SELECT rs.student_id INTO v_student_id
    FROM report_submissions rs
    WHERE rs.id = NEW.report_submission_id;
    
    -- Récupérer le seuil du département
    SELECT ds.plagiarism_threshold INTO v_threshold
    FROM department_settings ds
    JOIN profiles p ON p.department_id = ds.department_id
    WHERE p.id = v_student_id;
    
    INSERT INTO alerts (
      user_id, alert_type, severity, title, message,
      related_entity_type, related_entity_id
    ) VALUES (
      v_student_id,
      'plagiarism_failed',
      'error',
      'Contrôle Anti-Plagiat Échoué',
      'Votre document a un taux de similarité de ' || NEW.similarity_percentage || 
      '% (seuil: ' || v_threshold || '%). Veuillez réviser votre travail.',
      'document',
      NEW.report_submission_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_plagiarism_failed_alert ON plagiarism_reports;
CREATE TRIGGER trigger_plagiarism_failed_alert
  AFTER INSERT OR UPDATE ON plagiarism_reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_plagiarism_failed_alert();


-- ===== TRIGGER 6: Alerte étudiant inactif =====
CREATE OR REPLACE FUNCTION check_inactive_students()
RETURNS void AS $$
DECLARE
  v_student RECORD;
  v_last_activity TIMESTAMPTZ;
  v_supervisor_id UUID;
  v_meetings_exists BOOLEAN;
BEGIN
  -- Vérifier si la table meetings existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'meetings'
  ) INTO v_meetings_exists;
  
  FOR v_student IN 
    SELECT p.id, p.first_name, p.last_name
    FROM profiles p
    WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = 'student')
  LOOP
    -- Récupérer la dernière activité (document soumis ou rencontre)
    IF v_meetings_exists THEN
      -- Si la table meetings existe, l'inclure dans la vérification
      SELECT GREATEST(
        COALESCE(MAX(d.created_at), '1970-01-01'::TIMESTAMPTZ),
        COALESCE(MAX(m.created_at), '1970-01-01'::TIMESTAMPTZ)
      ) INTO v_last_activity
      FROM documents d
      FULL OUTER JOIN meetings m ON m.student_id = d.student_id
      WHERE d.student_id = v_student.id OR m.student_id = v_student.id;
    ELSE
      -- Sinon, vérifier uniquement les documents
      SELECT COALESCE(MAX(d.created_at), '1970-01-01'::TIMESTAMPTZ)
      INTO v_last_activity
      FROM documents d
      WHERE d.student_id = v_student.id;
    END IF;
    
    -- Si pas d'activité depuis 30 jours
    IF v_last_activity < NOW() - INTERVAL '30 days' THEN
      -- Récupérer l'encadreur
      SELECT supervisor_id INTO v_supervisor_id
      FROM supervisor_assignments
      WHERE student_id = v_student.id AND is_active = TRUE
      LIMIT 1;
      
      IF v_supervisor_id IS NOT NULL THEN
        -- Vérifier si l'alerte n'existe pas déjà
        IF NOT EXISTS (
          SELECT 1 FROM alerts
          WHERE user_id = v_supervisor_id
            AND alert_type = 'student_inactive'
            AND related_entity_id = v_student.id
            AND dismissed = FALSE
            AND created_at > NOW() - INTERVAL '7 days'
        ) THEN
          INSERT INTO alerts (
            user_id, alert_type, severity, title, message,
            related_entity_type, related_entity_id
          ) VALUES (
            v_supervisor_id,
            'student_inactive',
            'warning',
            'Étudiant Inactif',
            'L''étudiant ' || v_student.first_name || ' ' || v_student.last_name || 
            ' n''a pas eu d''activité depuis ' || 
            EXTRACT(DAY FROM NOW() - v_last_activity) || ' jours.',
            'theme',
            v_student.id
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== TRIGGER 7: Alerte rencontre planifiée =====
-- NOTE: Ce trigger est créé dans la migration 2 (create_meetings_table.sql)
-- car il dépend de la table meetings
-- Si vous exécutez cette migration avant la migration 2, ce trigger sera ignoré

DO $$
BEGIN
  -- Vérifier si la table meetings existe avant de créer le trigger
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'meetings'
  ) THEN
    -- Créer la fonction
    CREATE OR REPLACE FUNCTION trigger_meeting_scheduled_alert()
    RETURNS TRIGGER AS $func$
    BEGIN
      IF NEW.status = 'scheduled' THEN
        -- Alerte pour l'étudiant
        INSERT INTO alerts (
          user_id, alert_type, severity, title, message,
          related_entity_type, related_entity_id
        ) VALUES (
          NEW.student_id,
          'meeting_scheduled',
          'info',
          'Rencontre Planifiée',
          'Une rencontre avec votre encadreur est planifiée le ' || 
          TO_CHAR(NEW.meeting_date, 'DD/MM/YYYY à HH24:MI') ||
          CASE WHEN NEW.location IS NOT NULL THEN ' à ' || NEW.location ELSE '' END,
          'meeting',
          NEW.id
        );
        
        -- Alerte pour l'encadreur
        INSERT INTO alerts (
          user_id, alert_type, severity, title, message,
          related_entity_type, related_entity_id
        ) VALUES (
          NEW.supervisor_id,
          'meeting_scheduled',
          'info',
          'Rencontre Planifiée',
          'Rencontre avec votre étudiant le ' || 
          TO_CHAR(NEW.meeting_date, 'DD/MM/YYYY à HH24:MI'),
          'meeting',
          NEW.id
        );
      END IF;
      
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    -- Créer le trigger
    DROP TRIGGER IF EXISTS trigger_meeting_scheduled_alert ON meetings;
    CREATE TRIGGER trigger_meeting_scheduled_alert
      AFTER INSERT OR UPDATE ON meetings
      FOR EACH ROW
      WHEN (NEW.status = 'scheduled')
      EXECUTE FUNCTION trigger_meeting_scheduled_alert();
      
    RAISE NOTICE 'Trigger meeting_scheduled_alert créé avec succès';
  ELSE
    RAISE NOTICE 'Table meetings non trouvée - trigger meeting_scheduled_alert sera créé dans la migration 2';
  END IF;
END $$;


-- ===== TRIGGER 8: Alerte commentaire ajouté =====
CREATE OR REPLACE FUNCTION trigger_comment_added_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_document RECORD;
BEGIN
  -- Récupérer les infos du document
  SELECT * INTO v_document
  FROM documents
  WHERE id = NEW.document_id;
  
  -- Alerte pour l'étudiant si c'est l'encadreur qui commente
  IF NEW.author_id != v_document.student_id THEN
    INSERT INTO alerts (
      user_id, alert_type, severity, title, message,
      related_entity_type, related_entity_id
    ) VALUES (
      v_document.student_id,
      'comment_added',
      'info',
      'Nouveau Commentaire',
      'Un commentaire a été ajouté sur votre document "' || v_document.title || '"',
      'document',
      v_document.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_comment_added_alert ON document_comments;
CREATE TRIGGER trigger_comment_added_alert
  AFTER INSERT ON document_comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_comment_added_alert();


-- ===== Fonction pour exécuter toutes les vérifications périodiques =====
CREATE OR REPLACE FUNCTION run_periodic_alert_checks()
RETURNS void AS $$
BEGIN
  PERFORM trigger_deadline_alert();
  PERFORM check_inactive_students();
  PERFORM cleanup_expired_alerts();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== Commentaires =====
COMMENT ON FUNCTION trigger_deadline_alert() IS 'Génère des alertes pour les deadlines approchant';
COMMENT ON FUNCTION check_inactive_students() IS 'Alerte les encadreurs des étudiants inactifs';
COMMENT ON FUNCTION run_periodic_alert_checks() IS 'Exécute toutes les vérifications périodiques (à lancer via cron)';

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Pour annuler cette migration, exécuter:
/*
DROP FUNCTION IF EXISTS run_periodic_alert_checks();
DROP TRIGGER IF EXISTS trigger_comment_added_alert ON document_comments;
DROP FUNCTION IF EXISTS trigger_comment_added_alert();
DROP TRIGGER IF EXISTS trigger_meeting_scheduled_alert ON meetings;
DROP FUNCTION IF EXISTS trigger_meeting_scheduled_alert();
DROP FUNCTION IF EXISTS check_inactive_students();
DROP TRIGGER IF EXISTS trigger_plagiarism_failed_alert ON plagiarism_reports;
DROP FUNCTION IF EXISTS trigger_plagiarism_failed_alert();
DROP TRIGGER IF EXISTS trigger_validation_required_alert ON documents;
DROP FUNCTION IF EXISTS trigger_validation_required_alert();
DROP TRIGGER IF EXISTS trigger_defense_scheduled_alert ON defense_sessions;
DROP FUNCTION IF EXISTS trigger_defense_scheduled_alert();
DROP TRIGGER IF EXISTS trigger_document_rejected_alert ON documents;
DROP FUNCTION IF EXISTS trigger_document_rejected_alert();
DROP FUNCTION IF EXISTS trigger_deadline_alert();
*/
