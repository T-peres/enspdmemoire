-- =====================================================
-- FONCTION: get_department_stats
-- Description: Récupère les statistiques d'un département
-- =====================================================

CREATE OR REPLACE FUNCTION get_department_stats(p_department_id UUID)
RETURNS TABLE (
  total_students BIGINT,
  students_with_supervisor BIGINT,
  pending_themes BIGINT,
  approved_themes BIGINT,
  pending_meetings BIGINT,
  pending_defenses BIGINT,
  completed_defenses BIGINT,
  avg_progress NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total des étudiants du département
    (SELECT COUNT(DISTINCT p.id)
     FROM profiles p
     INNER JOIN user_roles ur ON ur.user_id = p.id
     WHERE ur.role = 'student' 
     AND p.department_id = p_department_id)::BIGINT as total_students,
    
    -- Étudiants avec encadreur
    (SELECT COUNT(DISTINCT sa.student_id)
     FROM supervisor_assignments sa
     INNER JOIN profiles p ON p.id = sa.student_id
     WHERE sa.is_active = TRUE 
     AND p.department_id = p_department_id)::BIGINT as students_with_supervisor,
    
    -- Thèmes en attente
    (SELECT COUNT(*)
     FROM themes t
     INNER JOIN profiles p ON p.id = t.student_id
     WHERE t.status = 'pending' 
     AND p.department_id = p_department_id)::BIGINT as pending_themes,
    
    -- Thèmes approuvés
    (SELECT COUNT(*)
     FROM themes t
     INNER JOIN profiles p ON p.id = t.student_id
     WHERE t.status = 'approved' 
     AND p.department_id = p_department_id)::BIGINT as approved_themes,
    
    -- Fiches de suivi en attente de validation
    (SELECT COUNT(*)
     FROM fiche_suivi fs
     INNER JOIN profiles p ON p.id = fs.student_id
     WHERE fs.supervisor_validated = TRUE 
     AND fs.department_head_validated = FALSE
     AND p.department_id = p_department_id)::BIGINT as pending_meetings,
    
    -- Soutenances en attente
    (SELECT COUNT(*)
     FROM defenses d
     INNER JOIN profiles p ON p.id = d.student_id
     WHERE d.status = 'scheduled'
     AND p.department_id = p_department_id)::BIGINT as pending_defenses,
    
    -- Soutenances terminées
    (SELECT COUNT(*)
     FROM defenses d
     INNER JOIN profiles p ON p.id = d.student_id
     WHERE d.status = 'completed'
     AND p.department_id = p_department_id)::BIGINT as completed_defenses,
    
    -- Progression moyenne
    (SELECT COALESCE(AVG(fs.overall_progress), 0)
     FROM fiche_suivi fs
     INNER JOIN profiles p ON p.id = fs.student_id
     WHERE p.department_id = p_department_id)::NUMERIC as avg_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION get_department_stats(UUID) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION get_department_stats IS 'Récupère les statistiques complètes d''un département pour le tableau de bord du chef de département';
