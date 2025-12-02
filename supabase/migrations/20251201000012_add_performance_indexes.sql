-- =====================================================
-- INDEXES D'OPTIMISATION
-- =====================================================
-- Date: 1er Décembre 2025
-- Description: Ajout d'indexes pour améliorer les performances des requêtes fréquentes

-- =====================================================
-- INDEXES SUR themes
-- =====================================================

-- Index composite pour recherche par étudiant et statut
CREATE INDEX IF NOT EXISTS idx_themes_student_status 
  ON themes(student_id, status);

-- Index pour recherche par encadreur et statut
CREATE INDEX IF NOT EXISTS idx_themes_supervisor_status 
  ON themes(supervisor_id, status) 
  WHERE supervisor_id IS NOT NULL;

-- Index pour tri par date de soumission
CREATE INDEX IF NOT EXISTS idx_themes_submitted_at 
  ON themes(submitted_at DESC);

-- =====================================================
-- INDEXES SUR documents
-- =====================================================

-- Index composite pour recherche par thème et type
CREATE INDEX IF NOT EXISTS idx_documents_theme_type 
  ON documents(theme_id, document_type);

-- Index composite pour recherche par étudiant et statut
CREATE INDEX IF NOT EXISTS idx_documents_student_status 
  ON documents(student_id, status);

-- Index pour tri par date de soumission
CREATE INDEX IF NOT EXISTS idx_documents_submitted_at 
  ON documents(submitted_at DESC);

-- Index pour recherche par version
CREATE INDEX IF NOT EXISTS idx_documents_version 
  ON documents(theme_id, document_type, version DESC);

-- =====================================================
-- INDEXES SUR fiche_suivi
-- =====================================================

-- Index pour recherche par validation encadreur
CREATE INDEX IF NOT EXISTS idx_fiche_suivi_supervisor_validated 
  ON fiche_suivi(supervisor_validated, supervisor_validation_date DESC) 
  WHERE supervisor_validated = TRUE;

-- Index pour recherche par validation chef département
CREATE INDEX IF NOT EXISTS idx_fiche_suivi_dept_head_validated 
  ON fiche_suivi(department_head_validated, department_head_validation_date DESC) 
  WHERE department_head_validated = TRUE;

-- Index pour recherche par progression globale
CREATE INDEX IF NOT EXISTS idx_fiche_suivi_overall_progress 
  ON fiche_suivi(overall_progress DESC);

-- =====================================================
-- INDEXES SUR plagiarism_reports
-- =====================================================

-- Index composite pour recherche par thème et statut
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_theme_status 
  ON plagiarism_reports(theme_id, status);

-- Index pour recherche par score de plagiat
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_score 
  ON plagiarism_reports(plagiarism_score DESC) 
  WHERE plagiarism_score IS NOT NULL;

-- Index pour recherche par résultat (passé/échoué)
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_passed 
  ON plagiarism_reports(passed, checked_at DESC) 
  WHERE passed IS NOT NULL;

-- =====================================================
-- INDEXES SUR supervisor_assignments
-- =====================================================

-- Index composite pour recherche par encadreur actif
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor_active 
  ON supervisor_assignments(supervisor_id, is_active) 
  WHERE is_active = TRUE;

-- Index pour recherche par date d'attribution
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_assigned_at 
  ON supervisor_assignments(assigned_at DESC);

-- =====================================================
-- INDEXES SUR defense_sessions (si la table existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'defense_sessions') THEN
    -- Index composite pour recherche par date et statut
    CREATE INDEX IF NOT EXISTS idx_defense_sessions_date_status 
      ON defense_sessions(defense_date DESC, status);

    -- Index pour recherche par étudiant
    CREATE INDEX IF NOT EXISTS idx_defense_sessions_student 
      ON defense_sessions(student_id);

    -- Index pour recherche par thème
    CREATE INDEX IF NOT EXISTS idx_defense_sessions_theme 
      ON defense_sessions(theme_id);
  END IF;
END $$;

-- =====================================================
-- INDEXES SUR final_grades (si la table existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'final_grades') THEN
    -- Index pour recherche par note finale
    CREATE INDEX IF NOT EXISTS idx_final_grades_final_grade 
      ON final_grades(final_grade DESC) 
      WHERE final_grade IS NOT NULL;

    -- Index pour recherche par étudiant
    CREATE INDEX IF NOT EXISTS idx_final_grades_student 
      ON final_grades(student_id);
  END IF;
END $$;

-- =====================================================
-- INDEXES SUR jury_decisions
-- =====================================================

-- Index composite pour recherche par décision et date
CREATE INDEX IF NOT EXISTS idx_jury_decisions_decision_date 
  ON jury_decisions(decision, decided_at DESC);

-- Index pour recherche par corrections requises
CREATE INDEX IF NOT EXISTS idx_jury_decisions_corrections 
  ON jury_decisions(corrections_required, corrections_completed) 
  WHERE corrections_required = TRUE;

-- Index pour recherche par note
CREATE INDEX IF NOT EXISTS idx_jury_decisions_grade 
  ON jury_decisions(grade DESC) 
  WHERE grade IS NOT NULL;

-- =====================================================
-- INDEXES SUR archives
-- =====================================================

-- Index composite pour recherche par statut et date
CREATE INDEX IF NOT EXISTS idx_archives_status_date 
  ON archives(status, archived_at DESC);

-- Index pour recherche par publication
CREATE INDEX IF NOT EXISTS idx_archives_published 
  ON archives(published, published_at DESC) 
  WHERE published = TRUE;

-- Index pour recherche par niveau d'accès
CREATE INDEX IF NOT EXISTS idx_archives_access_level 
  ON archives(access_level);

-- =====================================================
-- INDEXES SUR notifications
-- =====================================================

-- Index composite pour recherche par utilisateur et statut de lecture
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications(user_id, read, created_at DESC);

-- Index pour recherche par type
CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON notifications(type, created_at DESC);

-- =====================================================
-- INDEXES SUR activity_logs
-- =====================================================

-- Index composite pour recherche par utilisateur et action
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_action 
  ON activity_logs(user_id, action, created_at DESC);

-- Index pour recherche par entité
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_full 
  ON activity_logs(entity_type, entity_id, created_at DESC);

-- =====================================================
-- INDEXES SUR profiles
-- =====================================================

-- Index pour recherche par département
CREATE INDEX IF NOT EXISTS idx_profiles_department_id 
  ON profiles(department_id) 
  WHERE department_id IS NOT NULL;

-- Index pour recherche par nom complet (pour autocomplete)
CREATE INDEX IF NOT EXISTS idx_profiles_full_name 
  ON profiles(first_name, last_name);

-- =====================================================
-- STATISTIQUES
-- =====================================================

-- Analyser les tables pour mettre à jour les statistiques
ANALYZE themes;
ANALYZE documents;
ANALYZE fiche_suivi;
ANALYZE plagiarism_reports;
ANALYZE supervisor_assignments;
ANALYZE jury_decisions;
ANALYZE archives;
ANALYZE notifications;
ANALYZE activity_logs;
ANALYZE profiles;

-- Commentaire
COMMENT ON INDEX idx_themes_student_status IS 'Optimise les requêtes de recherche de thèmes par étudiant et statut';
COMMENT ON INDEX idx_documents_theme_type IS 'Optimise les requêtes de recherche de documents par thème et type';
COMMENT ON INDEX idx_fiche_suivi_supervisor_validated IS 'Optimise les requêtes de recherche de fiches validées par l''encadreur';
