-- =====================================================
-- Script de correction: Supprimer les politiques RLS en double
-- Description: Nettoyer les politiques existantes avant de réexécuter la migration
-- Date: 2025-12-01
-- =====================================================

-- Supprimer toutes les politiques potentiellement en double sur documents
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'documents'
  ) THEN
    -- Supprimer toutes les variantes de politiques sur documents
    DROP POLICY IF EXISTS "Students can view own documents" ON documents;
    DROP POLICY IF EXISTS "Supervisors can view student documents" ON documents;
    DROP POLICY IF EXISTS "Department heads can view department documents" ON documents;
    DROP POLICY IF EXISTS "Jury can view defense documents" ON documents;
    DROP POLICY IF EXISTS "Students can create own documents" ON documents;
    DROP POLICY IF EXISTS "Les étudiants peuvent créer leurs propres documents" ON documents;
    DROP POLICY IF EXISTS "Students can update own documents" ON documents;
    
    RAISE NOTICE '✅ Politiques RLS supprimées sur documents';
  ELSE
    RAISE WARNING '⚠️ Table documents non trouvée';
  END IF;
END $$;

-- Supprimer toutes les politiques potentiellement en double sur defense_sessions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_sessions'
  ) THEN
    DROP POLICY IF EXISTS "Department heads can view department defenses" ON defense_sessions;
    DROP POLICY IF EXISTS "Students can view own defense" ON defense_sessions;
    DROP POLICY IF EXISTS "Jury members can view assigned defenses" ON defense_sessions;
    DROP POLICY IF EXISTS "Supervisors can view student defenses" ON defense_sessions;
    DROP POLICY IF EXISTS "Department heads can create defenses" ON defense_sessions;
    DROP POLICY IF EXISTS "Department heads can update defenses" ON defense_sessions;
    
    RAISE NOTICE '✅ Politiques RLS supprimées sur defense_sessions';
  END IF;
END $$;

-- Supprimer toutes les politiques potentiellement en double sur themes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'themes'
  ) THEN
    DROP POLICY IF EXISTS "Students can view own theme" ON themes;
    DROP POLICY IF EXISTS "Supervisors can view assigned themes" ON themes;
    DROP POLICY IF EXISTS "Department heads can view department themes" ON themes;
    DROP POLICY IF EXISTS "Students can create own theme" ON themes;
    DROP POLICY IF EXISTS "Students can update own theme" ON themes;
    
    RAISE NOTICE '✅ Politiques RLS supprimées sur themes';
  END IF;
END $$;

-- Supprimer toutes les politiques potentiellement en double sur fiche_suivi
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fiche_suivi'
  ) THEN
    DROP POLICY IF EXISTS "Students can view own fiche" ON fiche_suivi;
    DROP POLICY IF EXISTS "Supervisors can view student fiches" ON fiche_suivi;
    DROP POLICY IF EXISTS "Department heads can view department fiches" ON fiche_suivi;
    DROP POLICY IF EXISTS "Supervisors can update student fiches" ON fiche_suivi;
    DROP POLICY IF EXISTS "Department heads can validate fiches" ON fiche_suivi;
    
    RAISE NOTICE '✅ Politiques RLS supprimées sur fiche_suivi';
  END IF;
END $$;

-- Supprimer toutes les politiques potentiellement en double sur final_grades
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'final_grades'
  ) THEN
    DROP POLICY IF EXISTS "Students can view own grades" ON final_grades;
    DROP POLICY IF EXISTS "Supervisors can view student grades" ON final_grades;
    DROP POLICY IF EXISTS "Jury can manage grades" ON final_grades;
    DROP POLICY IF EXISTS "Students can view own published grades" ON final_grades;
    DROP POLICY IF EXISTS "Jury can view defense grades" ON final_grades;
    DROP POLICY IF EXISTS "Jury can update defense grades" ON final_grades;
    DROP POLICY IF EXISTS "Department heads can view all grades" ON final_grades;
    
    RAISE NOTICE '✅ Politiques RLS supprimées sur final_grades';
  END IF;
END $$;

-- Supprimer toutes les politiques potentiellement en double sur report_submissions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'report_submissions'
  ) THEN
    DROP POLICY IF EXISTS "Students can view own submissions" ON report_submissions;
    DROP POLICY IF EXISTS "Supervisors can view student submissions" ON report_submissions;
    DROP POLICY IF EXISTS "Students can create submissions" ON report_submissions;
    
    RAISE NOTICE '✅ Politiques RLS supprimées sur report_submissions';
  END IF;
END $$;

-- Supprimer toutes les politiques potentiellement en double sur plagiarism_reports
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'plagiarism_reports'
  ) THEN
    DROP POLICY IF EXISTS "Students can view own plagiarism reports" ON plagiarism_reports;
    DROP POLICY IF EXISTS "Supervisors can view student plagiarism reports" ON plagiarism_reports;
    DROP POLICY IF EXISTS "Department heads can view all plagiarism reports" ON plagiarism_reports;
    
    RAISE NOTICE '✅ Politiques RLS supprimées sur plagiarism_reports';
  END IF;
END $$;

-- Supprimer toutes les politiques potentiellement en double sur defense_minutes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_minutes'
  ) THEN
    DROP POLICY IF EXISTS "Students can view own defense minutes" ON defense_minutes;
    DROP POLICY IF EXISTS "Jury can manage defense minutes" ON defense_minutes;
    DROP POLICY IF EXISTS "Jury can view defense minutes" ON defense_minutes;
    DROP POLICY IF EXISTS "Jury can create defense minutes" ON defense_minutes;
    DROP POLICY IF EXISTS "Department heads can view all defense minutes" ON defense_minutes;
    
    RAISE NOTICE '✅ Politiques RLS supprimées sur defense_minutes';
  END IF;
END $$;

-- Afficher un résumé
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Nettoyage des politiques RLS terminé';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Vous pouvez maintenant réexécuter la migration 20251201000006_add_rls_policies.sql';
END $$;
