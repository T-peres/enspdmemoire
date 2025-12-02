-- =====================================================
-- Migration: Création des fonctions RPC essentielles
-- Description: Fonctions pour la logique métier complexe
-- Date: 2025-12-01
-- =====================================================

-- ===== NETTOYAGE: Supprimer toutes les anciennes versions =====

DROP FUNCTION IF EXISTS check_final_submission_eligibility(UUID);
DROP FUNCTION IF EXISTS get_supervisor_performance(UUID);
DROP FUNCTION IF EXISTS get_department_statistics(UUID);
DROP FUNCTION IF EXISTS calculate_final_grade(UUID);
DROP FUNCTION IF EXISTS get_student_workflow_status(UUID);


-- ===== FONCTION 1: Vérifier l'éligibilité à la soumission finale =====

CREATE OR REPLACE FUNCTION check_final_submission_eligibility(p_student_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_plagiarism_passed BOOLEAN;
  v_supervisor_validated BOOLEAN;
  v_dept_head_validated BOOLEAN;
  v_evaluation_grade DECIMAL;
  v_min_meetings INTEGER;
  v_actual_meetings INTEGER;
  v_required_documents_ok BOOLEAN;
  v_can_submit_period BOOLEAN;
BEGIN
  -- 1. Vérifier le contrôle anti-plagiat
  SELECT pr.passed INTO v_plagiarism_passed
  FROM plagiarism_reports pr
  JOIN report_submissions rs ON rs.id = pr.report_submission_id
  WHERE rs.student_id = p_student_id
    AND rs.submission_type = 'final'
  ORDER BY rs.submitted_at DESC
  LIMIT 1;
  
  -- 2. Vérifier la validation des fiches de suivi
  SELECT 
    COALESCE(bool_and(supervisor_validated), FALSE),
    COALESCE(bool_and(department_head_validated), FALSE)
  INTO v_supervisor_validated, v_dept_head_validated
  FROM fiche_suivi
  WHERE student_id = p_student_id;
  
  -- 3. Vérifier l'évaluation intermédiaire
  SELECT supervision_grade INTO v_evaluation_grade
  FROM final_grades
  WHERE student_id = p_student_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- 4. Vérifier le nombre de rencontres
  SELECT ds.min_meetings_required INTO v_min_meetings
  FROM department_settings ds
  JOIN profiles p ON p.department_id = ds.department_id
  WHERE p.id = p_student_id;
  
  SELECT COUNT(*) INTO v_actual_meetings
  FROM meetings
  WHERE student_id = p_student_id
    AND status = 'completed'
    AND student_signature = TRUE
    AND supervisor_signature = TRUE;
  
  -- 5. Vérifier les documents requis
  SELECT (check_required_documents_submitted(p_student_id)->>'all_submitted')::BOOLEAN
  INTO v_required_documents_ok;
  
  -- 6. Vérifier la période de soumission
  SELECT can_submit_report(p_student_id) INTO v_can_submit_period;
  
  -- Construire le résultat
  v_result := jsonb_build_object(
    'eligible', (
      COALESCE(v_plagiarism_passed, FALSE) AND
      COALESCE(v_supervisor_validated, FALSE) AND
      COALESCE(v_dept_head_validated, FALSE) AND
      COALESCE(v_evaluation_grade, 0) >= 10 AND
      COALESCE(v_actual_meetings, 0) >= COALESCE(v_min_meetings, 0) AND
      COALESCE(v_required_documents_ok, FALSE) AND
      COALESCE(v_can_submit_period, FALSE)
    ),
    'checks', jsonb_build_object(
      'plagiarism_passed', COALESCE(v_plagiarism_passed, FALSE),
      'supervisor_validated', COALESCE(v_supervisor_validated, FALSE),
      'dept_head_validated', COALESCE(v_dept_head_validated, FALSE),
      'evaluation_grade', COALESCE(v_evaluation_grade, 0),
      'min_meetings_required', COALESCE(v_min_meetings, 0),
      'actual_meetings', COALESCE(v_actual_meetings, 0),
      'meetings_ok', COALESCE(v_actual_meetings, 0) >= COALESCE(v_min_meetings, 0),
      'required_documents_ok', COALESCE(v_required_documents_ok, FALSE),
      'submission_period_ok', COALESCE(v_can_submit_period, FALSE)
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== FONCTION 2: Obtenir les statistiques d'un encadreur =====

CREATE OR REPLACE FUNCTION get_supervisor_performance(p_supervisor_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_total_students INTEGER;
  v_active_students INTEGER;
  v_completed_students INTEGER;
  v_success_rate DECIMAL;
  v_avg_validation_days DECIMAL;
  v_pending_validations INTEGER;
  v_avg_grade DECIMAL;
BEGIN
  -- Nombre total d'étudiants (historique)
  SELECT COUNT(DISTINCT student_id) INTO v_total_students
  FROM supervisor_assignments
  WHERE supervisor_id = p_supervisor_id;
  
  -- Étudiants actifs
  SELECT COUNT(*) INTO v_active_students
  FROM supervisor_assignments
  WHERE supervisor_id = p_supervisor_id AND is_active = TRUE;
  
  -- Étudiants ayant terminé (soutenance complétée)
  SELECT COUNT(DISTINCT sa.student_id) INTO v_completed_students
  FROM supervisor_assignments sa
  JOIN defense_sessions ds ON ds.student_id = sa.student_id
  WHERE sa.supervisor_id = p_supervisor_id
    AND ds.status = 'completed';
  
  -- Taux de réussite
  v_success_rate := CASE 
    WHEN v_completed_students > 0 
    THEN (v_completed_students::DECIMAL / NULLIF(v_total_students, 0)) * 100
    ELSE 0
  END;
  
  -- Délai moyen de validation des fiches
  SELECT AVG(EXTRACT(DAY FROM (supervisor_validation_date - created_at))) INTO v_avg_validation_days
  FROM fiche_suivi
  WHERE supervisor_id = p_supervisor_id
    AND supervisor_validated = TRUE
    AND supervisor_validation_date IS NOT NULL;
  
  -- Validations en attente
  SELECT COUNT(*) INTO v_pending_validations
  FROM documents
  WHERE supervisor_id = p_supervisor_id
    AND status = 'pending';
  
  -- Note moyenne des étudiants
  SELECT AVG(fg.final_grade) INTO v_avg_grade
  FROM final_grades fg
  JOIN supervisor_assignments sa ON sa.student_id = fg.student_id
  WHERE sa.supervisor_id = p_supervisor_id
    AND fg.is_published = TRUE;
  
  v_result := jsonb_build_object(
    'total_students', v_total_students,
    'active_students', v_active_students,
    'completed_students', v_completed_students,
    'success_rate', ROUND(v_success_rate, 2),
    'avg_validation_days', ROUND(COALESCE(v_avg_validation_days, 0), 1),
    'pending_validations', v_pending_validations,
    'avg_student_grade', ROUND(COALESCE(v_avg_grade, 0), 2)
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== FONCTION 3: Obtenir les statistiques d'un département =====

CREATE OR REPLACE FUNCTION get_department_statistics(p_department_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_total_students INTEGER;
  v_total_supervisors INTEGER;
  v_total_themes INTEGER;
  v_pending_validations INTEGER;
  v_scheduled_defenses INTEGER;
  v_completed_defenses INTEGER;
  v_avg_plagiarism_score DECIMAL;
  v_plagiarism_failures INTEGER;
BEGIN
  -- Nombre d'étudiants
  SELECT COUNT(*) INTO v_total_students
  FROM profiles p
  WHERE p.department_id = p_department_id
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = 'student');
  
  -- Nombre d'encadreurs
  SELECT COUNT(*) INTO v_total_supervisors
  FROM profiles p
  WHERE p.department_id = p_department_id
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = 'supervisor');
  
  -- Nombre de thèmes
  SELECT COUNT(*) INTO v_total_themes
  FROM themes
  WHERE department_id = p_department_id;
  
  -- Validations en attente
  SELECT COUNT(*) INTO v_pending_validations
  FROM fiche_suivi fs
  WHERE fs.department_id = p_department_id
    AND (fs.supervisor_validated = FALSE OR fs.department_head_validated = FALSE);
  
  -- Soutenances planifiées
  SELECT COUNT(*) INTO v_scheduled_defenses
  FROM defense_sessions
  WHERE department_id = p_department_id
    AND status = 'scheduled';
  
  -- Soutenances complétées
  SELECT COUNT(*) INTO v_completed_defenses
  FROM defense_sessions
  WHERE department_id = p_department_id
    AND status = 'completed';
  
  -- Score moyen de plagiat
  SELECT AVG(pr.similarity_percentage) INTO v_avg_plagiarism_score
  FROM plagiarism_reports pr
  JOIN report_submissions rs ON rs.id = pr.report_submission_id
  JOIN profiles p ON p.id = rs.student_id
  WHERE p.department_id = p_department_id;
  
  -- Échecs de plagiat
  SELECT COUNT(*) INTO v_plagiarism_failures
  FROM plagiarism_reports pr
  JOIN report_submissions rs ON rs.id = pr.report_submission_id
  JOIN profiles p ON p.id = rs.student_id
  WHERE p.department_id = p_department_id
    AND pr.passed = FALSE;
  
  v_result := jsonb_build_object(
    'total_students', v_total_students,
    'total_supervisors', v_total_supervisors,
    'total_themes', v_total_themes,
    'pending_validations', v_pending_validations,
    'scheduled_defenses', v_scheduled_defenses,
    'completed_defenses', v_completed_defenses,
    'avg_plagiarism_score', ROUND(COALESCE(v_avg_plagiarism_score, 0), 2),
    'plagiarism_failures', v_plagiarism_failures,
    'students_per_supervisor', CASE 
      WHEN v_total_supervisors > 0 
      THEN ROUND(v_total_students::DECIMAL / v_total_supervisors, 1)
      ELSE 0 
    END
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== FONCTION 4: Calculer la note finale =====

CREATE OR REPLACE FUNCTION calculate_final_grade(p_student_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_settings RECORD;
  v_supervision_grade DECIMAL;
  v_report_grade DECIMAL;
  v_defense_grade DECIMAL;
  v_final_grade DECIMAL;
  v_decision TEXT;
BEGIN
  -- Récupérer les paramètres du département
  SELECT ds.* INTO v_settings
  FROM department_settings ds
  JOIN profiles p ON p.department_id = ds.department_id
  WHERE p.id = p_student_id;
  
  -- Récupérer les notes existantes
  SELECT 
    supervision_grade,
    report_grade,
    defense_grade
  INTO 
    v_supervision_grade,
    v_report_grade,
    v_defense_grade
  FROM final_grades
  WHERE student_id = p_student_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Calculer la note finale
  v_final_grade := 
    (COALESCE(v_supervision_grade, 0) * v_settings.supervision_weight) +
    (COALESCE(v_report_grade, 0) * v_settings.report_weight) +
    (COALESCE(v_defense_grade, 0) * v_settings.defense_weight);
  
  -- Déterminer la décision
  v_decision := CASE
    WHEN v_final_grade >= v_settings.min_passing_grade THEN 'passed'
    WHEN v_final_grade >= (v_settings.min_passing_grade - 2) THEN 'deliberation'
    ELSE 'failed'
  END;
  
  RETURN jsonb_build_object(
    'supervision_grade', COALESCE(v_supervision_grade, 0),
    'report_grade', COALESCE(v_report_grade, 0),
    'defense_grade', COALESCE(v_defense_grade, 0),
    'final_grade', ROUND(v_final_grade, 2),
    'decision', v_decision,
    'weights', jsonb_build_object(
      'supervision', v_settings.supervision_weight,
      'report', v_settings.report_weight,
      'defense', v_settings.defense_weight
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== FONCTION 5: Obtenir le workflow d'un étudiant =====

CREATE OR REPLACE FUNCTION get_student_workflow_status(p_student_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_has_theme BOOLEAN;
  v_has_supervisor BOOLEAN;
  v_documents_ok BOOLEAN;
  v_meetings_ok BOOLEAN;
  v_fiches_validated BOOLEAN;
  v_plagiarism_ok BOOLEAN;
  v_can_submit BOOLEAN;
  v_defense_scheduled BOOLEAN;
  v_defense_completed BOOLEAN;
  v_grades_published BOOLEAN;
BEGIN
  -- Vérifier chaque étape du workflow
  
  -- 1. Thème sélectionné
  SELECT EXISTS (
    SELECT 1 FROM themes WHERE student_id = p_student_id AND status = 'approved'
  ) INTO v_has_theme;
  
  -- 2. Encadreur assigné
  SELECT EXISTS (
    SELECT 1 FROM supervisor_assignments WHERE student_id = p_student_id AND is_active = TRUE
  ) INTO v_has_supervisor;
  
  -- 3. Documents requis soumis
  SELECT (check_required_documents_submitted(p_student_id)->>'all_submitted')::BOOLEAN
  INTO v_documents_ok;
  
  -- 4. Rencontres suffisantes
  SELECT (check_final_submission_eligibility(p_student_id)->'checks'->>'meetings_ok')::BOOLEAN
  INTO v_meetings_ok;
  
  -- 5. Fiches validées
  SELECT (check_final_submission_eligibility(p_student_id)->'checks'->>'supervisor_validated')::BOOLEAN
  INTO v_fiches_validated;
  
  -- 6. Plagiat OK
  SELECT (check_final_submission_eligibility(p_student_id)->'checks'->>'plagiarism_passed')::BOOLEAN
  INTO v_plagiarism_ok;
  
  -- 7. Peut soumettre
  SELECT (check_final_submission_eligibility(p_student_id)->>'eligible')::BOOLEAN
  INTO v_can_submit;
  
  -- 8. Soutenance planifiée
  SELECT EXISTS (
    SELECT 1 FROM defense_sessions WHERE student_id = p_student_id AND status IN ('scheduled', 'completed')
  ) INTO v_defense_scheduled;
  
  -- 9. Soutenance complétée
  SELECT EXISTS (
    SELECT 1 FROM defense_sessions WHERE student_id = p_student_id AND status = 'completed'
  ) INTO v_defense_completed;
  
  -- 10. Notes publiées
  SELECT EXISTS (
    SELECT 1 FROM final_grades WHERE student_id = p_student_id AND is_published = TRUE
  ) INTO v_grades_published;
  
  v_result := jsonb_build_object(
    'steps', jsonb_build_object(
      'theme_selected', COALESCE(v_has_theme, FALSE),
      'supervisor_assigned', COALESCE(v_has_supervisor, FALSE),
      'documents_submitted', COALESCE(v_documents_ok, FALSE),
      'meetings_completed', COALESCE(v_meetings_ok, FALSE),
      'fiches_validated', COALESCE(v_fiches_validated, FALSE),
      'plagiarism_passed', COALESCE(v_plagiarism_ok, FALSE),
      'can_submit_final', COALESCE(v_can_submit, FALSE),
      'defense_scheduled', COALESCE(v_defense_scheduled, FALSE),
      'defense_completed', COALESCE(v_defense_completed, FALSE),
      'grades_published', COALESCE(v_grades_published, FALSE)
    ),
    'current_step', CASE
      WHEN NOT COALESCE(v_has_theme, FALSE) THEN 'theme_selection'
      WHEN NOT COALESCE(v_has_supervisor, FALSE) THEN 'supervisor_assignment'
      WHEN NOT COALESCE(v_documents_ok, FALSE) THEN 'document_submission'
      WHEN NOT COALESCE(v_meetings_ok, FALSE) THEN 'meetings'
      WHEN NOT COALESCE(v_fiches_validated, FALSE) THEN 'fiche_validation'
      WHEN NOT COALESCE(v_plagiarism_ok, FALSE) THEN 'plagiarism_check'
      WHEN NOT COALESCE(v_defense_scheduled, FALSE) THEN 'defense_scheduling'
      WHEN NOT COALESCE(v_defense_completed, FALSE) THEN 'defense'
      WHEN NOT COALESCE(v_grades_published, FALSE) THEN 'grading'
      ELSE 'completed'
    END,
    'completion_percentage', (
      (COALESCE(v_has_theme, FALSE)::INTEGER +
       COALESCE(v_has_supervisor, FALSE)::INTEGER +
       COALESCE(v_documents_ok, FALSE)::INTEGER +
       COALESCE(v_meetings_ok, FALSE)::INTEGER +
       COALESCE(v_fiches_validated, FALSE)::INTEGER +
       COALESCE(v_plagiarism_ok, FALSE)::INTEGER +
       COALESCE(v_defense_scheduled, FALSE)::INTEGER +
       COALESCE(v_defense_completed, FALSE)::INTEGER +
       COALESCE(v_grades_published, FALSE)::INTEGER) * 100.0 / 9
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Pour annuler cette migration, exécuter:
/*
DROP FUNCTION IF EXISTS get_student_workflow_status(UUID);
DROP FUNCTION IF EXISTS calculate_final_grade(UUID);
DROP FUNCTION IF EXISTS get_department_statistics(UUID);
DROP FUNCTION IF EXISTS get_supervisor_performance(UUID);
DROP FUNCTION IF EXISTS check_final_submission_eligibility(UUID);
*/
