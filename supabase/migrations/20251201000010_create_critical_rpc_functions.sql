-- =====================================================
-- RPC CRITIQUES - SYSTÈME DE GESTION DES MÉMOIRES
-- =====================================================
-- Date: 1er Décembre 2025
-- Description: Implémentation des 3 RPC critiques + fonctions manquantes

-- =====================================================
-- FONCTION HELPER: Vérifier si un utilisateur a un rôle
-- =====================================================

CREATE OR REPLACE FUNCTION has_role(p_user_id UUID, p_role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_user_id AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC 1: check_final_submission_eligibility
-- =====================================================
-- Vérifie si un étudiant peut soumettre sa version finale
-- Critères:
-- 1. Plagiat passé (score < seuil)
-- 2. Fiches de suivi validées (encadreur + chef département)
-- 3. Évaluation intermédiaire >= 10/20

CREATE OR REPLACE FUNCTION check_final_submission_eligibility(p_student_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_theme_id UUID;
  v_plagiarism_passed BOOLEAN := FALSE;
  v_plagiarism_score DECIMAL;
  v_supervisor_validated BOOLEAN := FALSE;
  v_dept_head_validated BOOLEAN := FALSE;
  v_evaluation_grade DECIMAL := 0;
  v_eligible BOOLEAN := FALSE;
  v_missing_requirements TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Récupérer le thème approuvé de l'étudiant
  SELECT id INTO v_theme_id
  FROM themes
  WHERE student_id = p_student_id 
    AND status = 'approved'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_theme_id IS NULL THEN
    v_missing_requirements := array_append(v_missing_requirements, 'Aucun thème approuvé');
  ELSE
    -- 1. Vérifier le plagiat
    SELECT 
      pr.passed,
      pr.plagiarism_score
    INTO v_plagiarism_passed, v_plagiarism_score
    FROM plagiarism_reports pr
    JOIN documents d ON d.id = pr.document_id
    WHERE d.theme_id = v_theme_id
      AND d.document_type = 'final_version'
    ORDER BY pr.created_at DESC
    LIMIT 1;

    IF v_plagiarism_passed IS NULL OR v_plagiarism_passed = FALSE THEN
      v_missing_requirements := array_append(
        v_missing_requirements, 
        'Contrôle anti-plagiat non passé ou non effectué'
      );
    END IF;

    -- 2. Vérifier les validations de la fiche de suivi
    SELECT 
      supervisor_validated,
      department_head_validated
    INTO v_supervisor_validated, v_dept_head_validated
    FROM fiche_suivi
    WHERE theme_id = v_theme_id;

    IF v_supervisor_validated IS NULL OR v_supervisor_validated = FALSE THEN
      v_missing_requirements := array_append(
        v_missing_requirements, 
        'Fiche de suivi non validée par l''encadreur'
      );
    END IF;

    IF v_dept_head_validated IS NULL OR v_dept_head_validated = FALSE THEN
      v_missing_requirements := array_append(
        v_missing_requirements, 
        'Fiche de suivi non validée par le chef de département'
      );
    END IF;

    -- 3. Vérifier l'évaluation intermédiaire (note d'encadrement)
    SELECT supervision_grade INTO v_evaluation_grade
    FROM final_grades
    WHERE student_id = p_student_id;

    IF v_evaluation_grade IS NULL OR v_evaluation_grade < 10 THEN
      v_missing_requirements := array_append(
        v_missing_requirements, 
        'Évaluation intermédiaire insuffisante (< 10/20) ou non effectuée'
      );
    END IF;
  END IF;

  -- Déterminer l'éligibilité
  v_eligible := (
    v_theme_id IS NOT NULL AND
    COALESCE(v_plagiarism_passed, FALSE) = TRUE AND
    COALESCE(v_supervisor_validated, FALSE) = TRUE AND
    COALESCE(v_dept_head_validated, FALSE) = TRUE AND
    COALESCE(v_evaluation_grade, 0) >= 10
  );

  -- Construire le résultat
  v_result := jsonb_build_object(
    'eligible', v_eligible,
    'theme_id', v_theme_id,
    'checks', jsonb_build_object(
      'plagiarism_passed', COALESCE(v_plagiarism_passed, FALSE),
      'plagiarism_score', v_plagiarism_score,
      'supervisor_validated', COALESCE(v_supervisor_validated, FALSE),
      'dept_head_validated', COALESCE(v_dept_head_validated, FALSE),
      'evaluation_grade', COALESCE(v_evaluation_grade, 0)
    ),
    'missing_requirements', v_missing_requirements,
    'checked_at', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire pour la documentation
COMMENT ON FUNCTION check_final_submission_eligibility IS 
'Vérifie si un étudiant peut soumettre sa version finale. Retourne un objet JSON avec l''éligibilité et les détails des vérifications.';

-- =====================================================
-- RPC 2: generate_defense_minutes_pdf
-- =====================================================
-- Génère les données pour le PV de soutenance
-- Note: La génération PDF réelle se fera côté frontend ou via un service externe

CREATE OR REPLACE FUNCTION generate_defense_minutes_pdf(p_defense_session_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_defense RECORD;
  v_student RECORD;
  v_theme RECORD;
  v_supervisor RECORD;
  v_jury_members JSONB;
  v_grades RECORD;
  v_decision RECORD;
BEGIN
  -- Récupérer les données de la soutenance
  SELECT * INTO v_defense
  FROM defense_sessions
  WHERE id = p_defense_session_id;

  IF v_defense IS NULL THEN
    RAISE EXCEPTION 'Session de soutenance non trouvée: %', p_defense_session_id;
  END IF;

  -- Récupérer les données de l'étudiant
  SELECT 
    p.*,
    d.name as department_name,
    d.code as department_code
  INTO v_student
  FROM profiles p
  LEFT JOIN departments d ON d.id = p.department_id
  WHERE p.id = v_defense.student_id;

  -- Récupérer le thème
  SELECT * INTO v_theme
  FROM themes
  WHERE id = v_defense.theme_id;

  -- Récupérer l'encadreur
  SELECT * INTO v_supervisor
  FROM profiles
  WHERE id = v_theme.supervisor_id;

  -- Récupérer les membres du jury
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'email', p.email,
      'role', djm.role
    ) ORDER BY 
      CASE djm.role
        WHEN 'president' THEN 1
        WHEN 'rapporteur' THEN 2
        WHEN 'examiner' THEN 3
        ELSE 4
      END
  ) INTO v_jury_members
  FROM defense_jury_members djm
  JOIN profiles p ON p.id = djm.jury_member_id
  WHERE djm.defense_session_id = p_defense_session_id;

  -- Récupérer les notes
  SELECT * INTO v_grades
  FROM final_grades
  WHERE student_id = v_defense.student_id;

  -- Récupérer la décision du jury
  SELECT * INTO v_decision
  FROM jury_decisions
  WHERE theme_id = v_defense.theme_id;

  -- Construire le résultat complet
  v_result := jsonb_build_object(
    'defense_session', jsonb_build_object(
      'id', v_defense.id,
      'defense_date', v_defense.defense_date,
      'location', v_defense.location,
      'status', v_defense.status
    ),
    'student', jsonb_build_object(
      'id', v_student.id,
      'first_name', v_student.first_name,
      'last_name', v_student.last_name,
      'email', v_student.email,
      'student_id', v_student.student_id,
      'department', jsonb_build_object(
        'name', v_student.department_name,
        'code', v_student.department_code
      )
    ),
    'theme', jsonb_build_object(
      'id', v_theme.id,
      'title', v_theme.title,
      'description', v_theme.description
    ),
    'supervisor', jsonb_build_object(
      'id', v_supervisor.id,
      'first_name', v_supervisor.first_name,
      'last_name', v_supervisor.last_name,
      'email', v_supervisor.email
    ),
    'jury_members', COALESCE(v_jury_members, '[]'::jsonb),
    'grades', jsonb_build_object(
      'supervision_grade', v_grades.supervision_grade,
      'report_grade', v_grades.report_grade,
      'defense_grade', v_grades.defense_grade,
      'final_grade', v_grades.final_grade
    ),
    'decision', jsonb_build_object(
      'decision', v_decision.decision,
      'grade', v_decision.grade,
      'mention', v_decision.mention,
      'corrections_required', v_decision.corrections_required,
      'corrections_deadline', v_decision.corrections_deadline,
      'deliberation_notes', v_decision.deliberation_notes
    ),
    'generated_at', NOW()
  );

  -- Mettre à jour la table defense_minutes si elle existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'defense_minutes') THEN
    INSERT INTO defense_minutes (
      defense_session_id,
      content,
      generated_at
    ) VALUES (
      p_defense_session_id,
      v_result,
      NOW()
    )
    ON CONFLICT (defense_session_id) 
    DO UPDATE SET 
      content = v_result,
      generated_at = NOW();
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_defense_minutes_pdf IS 
'Génère les données complètes pour le PV de soutenance au format JSON. Ces données peuvent ensuite être utilisées pour générer un PDF côté frontend.';

-- =====================================================
-- RPC 3: get_supervisor_performance
-- =====================================================
-- Calcule les statistiques de performance d'un encadreur

CREATE OR REPLACE FUNCTION get_supervisor_performance(p_supervisor_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_total_students INTEGER := 0;
  v_active_students INTEGER := 0;
  v_completed_students INTEGER := 0;
  v_success_rate DECIMAL := 0;
  v_avg_validation_days DECIMAL := 0;
  v_avg_grade DECIMAL := 0;
  v_students_by_status JSONB;
  v_recent_validations JSONB;
BEGIN
  -- Nombre total d'étudiants assignés
  SELECT COUNT(*) INTO v_total_students
  FROM supervisor_assignments
  WHERE supervisor_id = p_supervisor_id;

  -- Étudiants actifs
  SELECT COUNT(*) INTO v_active_students
  FROM supervisor_assignments
  WHERE supervisor_id = p_supervisor_id 
    AND is_active = TRUE;

  -- Étudiants ayant terminé (soutenance complétée)
  SELECT COUNT(*) INTO v_completed_students
  FROM supervisor_assignments sa
  JOIN themes t ON t.student_id = sa.student_id AND t.supervisor_id = sa.supervisor_id
  JOIN defense_sessions ds ON ds.theme_id = t.id
  WHERE sa.supervisor_id = p_supervisor_id
    AND ds.status = 'completed';

  -- Taux de réussite
  IF v_total_students > 0 THEN
    v_success_rate := (v_completed_students::DECIMAL / v_total_students) * 100;
  END IF;

  -- Délai moyen de validation des fiches de suivi (en jours)
  SELECT AVG(EXTRACT(EPOCH FROM (supervisor_validation_date - created_at)) / 86400)
  INTO v_avg_validation_days
  FROM fiche_suivi
  WHERE supervisor_id = p_supervisor_id
    AND supervisor_validated = TRUE
    AND supervisor_validation_date IS NOT NULL;

  -- Note moyenne donnée
  SELECT AVG(supervision_grade) INTO v_avg_grade
  FROM final_grades fg
  JOIN supervisor_assignments sa ON sa.student_id = fg.student_id
  WHERE sa.supervisor_id = p_supervisor_id
    AND fg.supervision_grade IS NOT NULL;

  -- Répartition des étudiants par statut
  SELECT jsonb_object_agg(status, count)
  INTO v_students_by_status
  FROM (
    SELECT 
      COALESCE(t.status::TEXT, 'no_theme') as status,
      COUNT(*) as count
    FROM supervisor_assignments sa
    LEFT JOIN themes t ON t.student_id = sa.student_id 
      AND t.supervisor_id = sa.supervisor_id
      AND t.status = 'approved'
    WHERE sa.supervisor_id = p_supervisor_id
      AND sa.is_active = TRUE
    GROUP BY t.status
  ) sub;

  -- Dernières validations (5 plus récentes)
  SELECT jsonb_agg(
    jsonb_build_object(
      'student_name', p.first_name || ' ' || p.last_name,
      'theme_title', t.title,
      'validated_at', fs.supervisor_validation_date,
      'overall_progress', fs.overall_progress
    ) ORDER BY fs.supervisor_validation_date DESC
  )
  INTO v_recent_validations
  FROM fiche_suivi fs
  JOIN themes t ON t.id = fs.theme_id
  JOIN profiles p ON p.id = fs.student_id
  WHERE fs.supervisor_id = p_supervisor_id
    AND fs.supervisor_validated = TRUE
  ORDER BY fs.supervisor_validation_date DESC
  LIMIT 5;

  -- Construire le résultat
  v_result := jsonb_build_object(
    'supervisor_id', p_supervisor_id,
    'statistics', jsonb_build_object(
      'total_students', v_total_students,
      'active_students', v_active_students,
      'completed_students', v_completed_students,
      'success_rate', ROUND(v_success_rate, 2),
      'avg_validation_days', ROUND(COALESCE(v_avg_validation_days, 0), 1),
      'avg_grade', ROUND(COALESCE(v_avg_grade, 0), 2)
    ),
    'students_by_status', COALESCE(v_students_by_status, '{}'::jsonb),
    'recent_validations', COALESCE(v_recent_validations, '[]'::jsonb),
    'calculated_at', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_supervisor_performance IS 
'Calcule les statistiques de performance d''un encadreur: nombre d''étudiants, taux de réussite, délai moyen de validation, etc.';

-- =====================================================
-- FONCTION BONUS: calculate_final_grade
-- =====================================================
-- Calcule la note finale selon les pondérations du département

CREATE OR REPLACE FUNCTION calculate_final_grade(
  p_student_id UUID,
  p_supervision_grade DECIMAL DEFAULT NULL,
  p_report_grade DECIMAL DEFAULT NULL,
  p_defense_grade DECIMAL DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_department_id UUID;
  v_supervision_weight DECIMAL := 0.40;
  v_report_weight DECIMAL := 0.40;
  v_defense_weight DECIMAL := 0.20;
  v_final_grade DECIMAL;
  v_mention TEXT;
BEGIN
  -- Récupérer le département de l'étudiant
  SELECT department_id INTO v_department_id
  FROM profiles
  WHERE id = p_student_id;

  -- Récupérer les pondérations du département si elles existent
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_settings') THEN
    SELECT 
      supervision_weight,
      report_weight,
      defense_weight
    INTO v_supervision_weight, v_report_weight, v_defense_weight
    FROM department_settings
    WHERE department_id = v_department_id;
  END IF;

  -- Calculer la note finale
  v_final_grade := (
    COALESCE(p_supervision_grade, 0) * v_supervision_weight +
    COALESCE(p_report_grade, 0) * v_report_weight +
    COALESCE(p_defense_grade, 0) * v_defense_weight
  );

  -- Déterminer la mention
  v_mention := CASE
    WHEN v_final_grade >= 16 THEN 'Très Bien'
    WHEN v_final_grade >= 14 THEN 'Bien'
    WHEN v_final_grade >= 12 THEN 'Assez Bien'
    WHEN v_final_grade >= 10 THEN 'Passable'
    ELSE 'Ajourné'
  END;

  -- Mettre à jour la table final_grades
  INSERT INTO final_grades (
    student_id,
    supervision_grade,
    report_grade,
    defense_grade,
    final_grade
  ) VALUES (
    p_student_id,
    p_supervision_grade,
    p_report_grade,
    p_defense_grade,
    v_final_grade
  )
  ON CONFLICT (student_id) 
  DO UPDATE SET
    supervision_grade = COALESCE(p_supervision_grade, final_grades.supervision_grade),
    report_grade = COALESCE(p_report_grade, final_grades.report_grade),
    defense_grade = COALESCE(p_defense_grade, final_grades.defense_grade),
    final_grade = v_final_grade,
    updated_at = NOW();

  v_result := jsonb_build_object(
    'student_id', p_student_id,
    'grades', jsonb_build_object(
      'supervision', p_supervision_grade,
      'report', p_report_grade,
      'defense', p_defense_grade,
      'final', ROUND(v_final_grade, 2)
    ),
    'weights', jsonb_build_object(
      'supervision', v_supervision_weight,
      'report', v_report_weight,
      'defense', v_defense_weight
    ),
    'mention', v_mention,
    'calculated_at', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_final_grade IS 
'Calcule la note finale d''un étudiant selon les pondérations configurées pour son département.';

-- =====================================================
-- FONCTION: create_automatic_alert
-- =====================================================
-- Crée une alerte automatique pour un utilisateur

CREATE OR REPLACE FUNCTION create_automatic_alert(
  p_user_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_message TEXT,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  -- Vérifier si la table alerts existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alerts') THEN
    RAISE EXCEPTION 'Table alerts n''existe pas. Exécutez d''abord la migration 20251201000000_create_alerts_table.sql';
  END IF;

  INSERT INTO alerts (
    user_id,
    alert_type,
    severity,
    title,
    message,
    related_entity_type,
    related_entity_id
  ) VALUES (
    p_user_id,
    p_alert_type,
    p_severity,
    p_title,
    p_message,
    p_related_entity_type,
    p_related_entity_id
  )
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FONCTION: historize_fiche_suivi
-- =====================================================
-- Crée une entrée d'historique lors de la modification d'une fiche de suivi

CREATE OR REPLACE FUNCTION historize_fiche_suivi()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si la table fiche_suivi_history existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fiche_suivi_history') THEN
    INSERT INTO fiche_suivi_history (
      fiche_suivi_id,
      theme_id,
      student_id,
      supervisor_id,
      changes,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      NEW.theme_id,
      NEW.student_id,
      NEW.supervisor_id,
      jsonb_build_object(
        'old', row_to_json(OLD),
        'new', row_to_json(NEW)
      ),
      NEW.last_updated_by,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger si la table fiche_suivi existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fiche_suivi') THEN
    DROP TRIGGER IF EXISTS trigger_historize_fiche_suivi ON fiche_suivi;
    CREATE TRIGGER trigger_historize_fiche_suivi
      AFTER UPDATE ON fiche_suivi
      FOR EACH ROW
      EXECUTE FUNCTION historize_fiche_suivi();
  END IF;
END $$;

-- =====================================================
-- GRANTS (Permissions)
-- =====================================================

-- Permettre aux utilisateurs authentifiés d'appeler ces fonctions
GRANT EXECUTE ON FUNCTION check_final_submission_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION generate_defense_minutes_pdf TO authenticated;
GRANT EXECUTE ON FUNCTION get_supervisor_performance TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_final_grade TO authenticated;
GRANT EXECUTE ON FUNCTION has_role TO authenticated;
