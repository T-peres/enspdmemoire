-- =====================================================
-- Migration: Ajout des index manquants pour optimiser les performances
-- Description: Index sur les colonnes fréquemment utilisées dans les requêtes
-- Date: 2025-12-01
-- =====================================================

-- ===== INDEX SUR profiles =====

-- Index pour les recherches par département
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON profiles(department_id);

-- Index pour les recherches par email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Index pour les recherches par nom
CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(last_name, first_name);


-- ===== INDEX SUR user_roles =====

-- Index composite pour les vérifications de rôle
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role);

-- Index pour rechercher par rôle
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);


-- ===== INDEX SUR themes =====
-- NOTE: themes est une VUE, pas une table. Les index doivent être créés sur la table sous-jacente (thesis_topics)

-- Index pour les recherches par statut
-- CREATE INDEX IF NOT EXISTS idx_themes_status ON themes(status);

-- Index pour les thèmes actifs par département
-- CREATE INDEX IF NOT EXISTS idx_themes_department_status ON themes(department_id, status);

-- Index pour les recherches par encadreur
-- CREATE INDEX IF NOT EXISTS idx_themes_supervisor_id ON themes(supervisor_id);

-- Index pour les recherches par date de création
-- CREATE INDEX IF NOT EXISTS idx_themes_created_at ON themes(created_at DESC);

-- Index pour les thèmes validés
-- CREATE INDEX IF NOT EXISTS idx_themes_approved ON themes(id) WHERE status = 'approved';


-- ===== INDEX SUR supervisor_assignments =====

-- Index composite pour les assignations actives
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_active ON supervisor_assignments(supervisor_id, is_active);

-- Index pour rechercher les étudiants d'un encadreur
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor_student ON supervisor_assignments(supervisor_id, student_id);

-- Index pour les assignations actives par étudiant
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_student_active ON supervisor_assignments(student_id) WHERE is_active = TRUE;


-- ===== INDEX SUR documents =====

-- Index composite pour les documents par étudiant et statut
CREATE INDEX IF NOT EXISTS idx_documents_student_status ON documents(student_id, status);

-- Index pour les documents par type
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);

-- Index pour les documents en attente de validation (submitted ou under_review)
CREATE INDEX IF NOT EXISTS idx_documents_under_review ON documents(reviewed_by, status) WHERE status = 'under_review';

-- Index pour les recherches par date de soumission
CREATE INDEX IF NOT EXISTS idx_documents_submitted_at ON documents(submitted_at DESC);

-- Note: documents n'a pas de colonne department_id directe
-- Le département peut être obtenu via student_id -> profiles -> department_id


-- ===== INDEX SUR fiche_suivi =====

-- Index composite pour les fiches par étudiant et date
CREATE INDEX IF NOT EXISTS idx_fiche_suivi_student_date ON fiche_suivi(student_id, created_at DESC);

-- Index pour les fiches non validées par l'encadreur
CREATE INDEX IF NOT EXISTS idx_fiche_suivi_supervisor_pending ON fiche_suivi(supervisor_id) 
  WHERE supervisor_validated = FALSE;

-- Index pour les fiches non validées par le chef de département
-- Note: fiche_suivi n'a pas de colonne department_id directe
-- Le département peut être obtenu via student_id -> profiles -> department_id
CREATE INDEX IF NOT EXISTS idx_fiche_suivi_dept_pending ON fiche_suivi(student_id) 
  WHERE department_head_validated = FALSE;

-- Index pour les fiches par thème
CREATE INDEX IF NOT EXISTS idx_fiche_suivi_theme ON fiche_suivi(theme_id);


-- ===== INDEX SUR defense_sessions =====
-- NOTE: Les index sur defense_sessions existent déjà dans 20251127000000_complete_missing_relations.sql
-- Ajout d'index supplémentaires uniquement si la table existe

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'defense_sessions'
  ) THEN
    -- Index composite pour les soutenances par département et statut
    CREATE INDEX IF NOT EXISTS idx_defense_sessions_dept_status ON defense_sessions(department_id, status);

    -- Index pour les soutenances planifiées
    CREATE INDEX IF NOT EXISTS idx_defense_sessions_scheduled ON defense_sessions(scheduled_date) 
      WHERE status = 'scheduled';

    -- Index pour les soutenances complétées
    CREATE INDEX IF NOT EXISTS idx_defense_sessions_completed ON defense_sessions(scheduled_date) 
      WHERE status = 'completed';
      
    RAISE NOTICE '✅ Index créés sur defense_sessions';
  ELSE
    RAISE WARNING '⚠️ Table defense_sessions non trouvée - index non créés';
  END IF;
END $$;


-- ===== INDEX SUR defense_jury_members =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'defense_jury_members'
  ) THEN
    -- Index composite pour les membres du jury
    CREATE INDEX IF NOT EXISTS idx_defense_jury_session_member ON defense_jury_members(defense_session_id, jury_member_id);

    -- Index pour rechercher les soutenances d'un membre du jury
    CREATE INDEX IF NOT EXISTS idx_defense_jury_member_id ON defense_jury_members(jury_member_id);

    -- Index pour le président du jury
    CREATE INDEX IF NOT EXISTS idx_defense_jury_president ON defense_jury_members(defense_session_id) 
      WHERE role = 'president';
      
    RAISE NOTICE '✅ Index créés sur defense_jury_members';
  ELSE
    RAISE WARNING '⚠️ Table defense_jury_members non trouvée - index non créés';
  END IF;
END $$;


-- ===== INDEX SUR final_grades =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'final_grades'
  ) THEN
    -- Index pour les notes par étudiant
    CREATE INDEX IF NOT EXISTS idx_final_grades_student ON final_grades(student_id);

    -- Index pour les notes publiées
    CREATE INDEX IF NOT EXISTS idx_final_grades_published ON final_grades(is_published, student_id);

    -- Index pour les notes par session de soutenance (si la colonne existe)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'final_grades' AND column_name = 'defense_session_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_final_grades_defense_session ON final_grades(defense_session_id);
    END IF;

    -- Index pour les statistiques de notes
    CREATE INDEX IF NOT EXISTS idx_final_grades_final_grade ON final_grades(final_grade) WHERE is_published = TRUE;
    
    RAISE NOTICE '✅ Index créés sur final_grades';
  ELSE
    RAISE WARNING '⚠️ Table final_grades non trouvée - index non créés';
  END IF;
END $$;


-- ===== INDEX SUR report_submissions =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'report_submissions'
  ) THEN
    -- Index composite pour les soumissions par étudiant et type
    CREATE INDEX IF NOT EXISTS idx_report_submissions_student_type ON report_submissions(student_id, submission_type);

    -- Index pour les soumissions par date
    CREATE INDEX IF NOT EXISTS idx_report_submissions_date ON report_submissions(submitted_at DESC);

    -- Index pour les soumissions par thème
    CREATE INDEX IF NOT EXISTS idx_report_submissions_theme ON report_submissions(theme_id);

    -- Index pour les soumissions avec rapport de plagiat (si la colonne existe)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'report_submissions' AND column_name = 'plagiarism_report_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_report_submissions_plagiarism ON report_submissions(plagiarism_report_id);
    END IF;
    
    RAISE NOTICE '✅ Index créés sur report_submissions';
  ELSE
    RAISE WARNING '⚠️ Table report_submissions non trouvée - index non créés';
  END IF;
END $$;


-- ===== INDEX SUR plagiarism_reports =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'plagiarism_reports'
  ) THEN
    -- Index pour les rapports par soumission (si la colonne existe)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'plagiarism_reports' AND column_name = 'report_submission_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_submission ON plagiarism_reports(report_submission_id);
    END IF;

    -- Index pour les rapports échoués
    CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_failed ON plagiarism_reports(passed) WHERE passed = FALSE;

    -- Index pour les rapports par date
    CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_date ON plagiarism_reports(checked_at DESC);

    -- Index pour les statistiques de plagiat (plagiarism_score)
    CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_score ON plagiarism_reports(plagiarism_score);
    
    RAISE NOTICE '✅ Index créés sur plagiarism_reports';
  ELSE
    RAISE WARNING '⚠️ Table plagiarism_reports non trouvée - index non créés';
  END IF;
END $$;


-- ===== INDEX SUR document_comments =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'document_comments'
  ) THEN
    -- Index pour les commentaires par document
    CREATE INDEX IF NOT EXISTS idx_document_comments_document ON document_comments(document_id, created_at DESC);

    -- Index pour les commentaires par auteur
    CREATE INDEX IF NOT EXISTS idx_document_comments_author ON document_comments(author_id);
    
    RAISE NOTICE '✅ Index créés sur document_comments';
  ELSE
    RAISE WARNING '⚠️ Table document_comments non trouvée - index non créés';
  END IF;
END $$;


-- ===== INDEX SUR activity_logs =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
    -- Index composite pour les logs par utilisateur et date
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON activity_logs(user_id, created_at DESC);

    -- Index pour les logs par type d'action (colonne 'action')
    CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

    -- Index pour les logs par entité (existe déjà dans la migration de base)
    -- CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

    -- Index pour les logs récents (existe déjà dans la migration de base)
    -- CREATE INDEX IF NOT EXISTS idx_activity_logs_recent ON activity_logs(created_at DESC);
    
    RAISE NOTICE '✅ Index créés sur activity_logs';
  ELSE
    RAISE WARNING '⚠️ Table activity_logs non trouvée - index non créés';
  END IF;
END $$;


-- ===== INDEX SUR messages =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    -- Index pour les messages par expéditeur
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at DESC);

    -- Index pour les messages par destinataire
    CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, created_at DESC);

    -- Index pour les messages non lus (colonne 'read' et non 'is_read')
    CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, read) WHERE read = FALSE;

    -- Index pour les messages par conversation
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at DESC);
    
    RAISE NOTICE '✅ Index créés sur messages';
  ELSE
    RAISE WARNING '⚠️ Table messages non trouvée - index non créés';
  END IF;
END $$;


-- ===== INDEX SUR thesis_topics =====
-- NOTE: thesis_topics est la table sous-jacente pour la vue themes

-- Index pour les sujets par encadreur
CREATE INDEX IF NOT EXISTS idx_thesis_topics_supervisor ON thesis_topics(supervisor_id);

-- Index pour les sujets par département
CREATE INDEX IF NOT EXISTS idx_thesis_topics_department ON thesis_topics(department_id);

-- Index pour les sujets disponibles (basé sur status et current_students < max_students)
CREATE INDEX IF NOT EXISTS idx_thesis_topics_available ON thesis_topics(status, current_students, max_students) 
  WHERE status = 'approved' AND current_students < max_students;

-- Index pour les recherches par titre
CREATE INDEX IF NOT EXISTS idx_thesis_topics_title ON thesis_topics USING gin(to_tsvector('french', title));

-- Index pour les recherches par description
CREATE INDEX IF NOT EXISTS idx_thesis_topics_description ON thesis_topics USING gin(to_tsvector('french', description));

-- Index pour les recherches par statut (équivalent à themes)
CREATE INDEX IF NOT EXISTS idx_thesis_topics_status ON thesis_topics(status);

-- Index composite département + statut
CREATE INDEX IF NOT EXISTS idx_thesis_topics_dept_status ON thesis_topics(department_id, status);

-- Index pour les sujets validés
CREATE INDEX IF NOT EXISTS idx_thesis_topics_approved ON thesis_topics(id) WHERE status = 'approved';

-- Index pour les recherches par date de création
CREATE INDEX IF NOT EXISTS idx_thesis_topics_created_at ON thesis_topics(created_at DESC);

-- Index full-text combiné titre + description
CREATE INDEX IF NOT EXISTS idx_thesis_topics_fulltext ON thesis_topics 
  USING gin(to_tsvector('french', title || ' ' || COALESCE(description, '')));


-- ===== INDEX SUR departments =====

-- Index pour les recherches par nom de département
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

-- Note: Vérifier si la colonne is_active existe dans departments avant de créer cet index
-- CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(id) WHERE is_active = TRUE;


-- ===== INDEX SUR evaluation_criteria =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'evaluation_criteria'
  ) THEN
    -- Index pour les critères par département
    CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_department ON evaluation_criteria(department_id);

    -- Index pour les critères actifs (si la colonne existe)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'evaluation_criteria' AND column_name = 'is_active'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_evaluation_criteria_active ON evaluation_criteria(is_active) WHERE is_active = TRUE;
    END IF;
    
    RAISE NOTICE '✅ Index créés sur evaluation_criteria';
  ELSE
    RAISE WARNING '⚠️ Table evaluation_criteria non trouvée - index non créés';
  END IF;
END $$;


-- ===== INDEX FULL-TEXT SEARCH =====

-- Index pour la recherche full-text sur les thèmes
-- NOTE: themes est une VUE - créer l'index sur thesis_topics à la place
-- CREATE INDEX IF NOT EXISTS idx_themes_fulltext ON themes 
--   USING gin(to_tsvector('french', title || ' ' || COALESCE(description, '')));

-- Index pour la recherche full-text sur les documents (title + feedback)
CREATE INDEX IF NOT EXISTS idx_documents_fulltext ON documents 
  USING gin(to_tsvector('french', title || ' ' || COALESCE(feedback, '')));


-- ===== STATISTIQUES ET MAINTENANCE =====

-- Fonction pour analyser les tables et mettre à jour les statistiques
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
  ANALYZE profiles;
  ANALYZE user_roles;
  -- ANALYZE themes; -- themes est une vue, pas une table
  ANALYZE thesis_topics; -- Analyser la table sous-jacente
  ANALYZE supervisor_assignments;
  ANALYZE documents;
  ANALYZE fiche_suivi;
  ANALYZE defense_sessions;
  ANALYZE defense_jury_members;
  ANALYZE final_grades;
  ANALYZE report_submissions;
  ANALYZE plagiarism_reports;
  ANALYZE meetings;
  ANALYZE alerts;
  ANALYZE department_settings;
  ANALYZE activity_logs;
  ANALYZE messages;
  ANALYZE thesis_topics;
  ANALYZE departments;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques d'utilisation des index
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE(
  table_name TEXT,
  index_name TEXT,
  index_scans BIGINT,
  tuples_read BIGINT,
  tuples_fetched BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename AS table_name,
    indexrelname AS index_name,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour identifier les index inutilisés
CREATE OR REPLACE FUNCTION find_unused_indexes()
RETURNS TABLE(
  table_name TEXT,
  index_name TEXT,
  index_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename AS table_name,
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
  ORDER BY pg_relation_size(indexrelid) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires
COMMENT ON FUNCTION update_table_statistics() IS 'Met à jour les statistiques de toutes les tables principales';
COMMENT ON FUNCTION get_index_usage_stats() IS 'Retourne les statistiques d''utilisation des index';
COMMENT ON FUNCTION find_unused_indexes() IS 'Identifie les index qui ne sont jamais utilisés';

-- Exécuter l'analyse initiale
SELECT update_table_statistics();

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Pour annuler cette migration, exécuter:
/*
DROP FUNCTION IF EXISTS find_unused_indexes();
DROP FUNCTION IF EXISTS get_index_usage_stats();
DROP FUNCTION IF EXISTS update_table_statistics();

-- Supprimer tous les index créés (liste complète)
DROP INDEX IF EXISTS idx_profiles_department_id;
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_profiles_name;
DROP INDEX IF EXISTS idx_profiles_active;
-- ... (continuer pour tous les index)
*/
