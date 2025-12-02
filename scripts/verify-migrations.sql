-- =====================================================
-- Script de Vérification des Migrations
-- Description: Vérifier que toutes les migrations ont été appliquées correctement
-- Usage: Exécuter dans l'éditeur SQL de Supabase
-- =====================================================

-- ===== SECTION 1: VÉRIFICATION DES TABLES =====
\echo '=== VÉRIFICATION DES TABLES ==='

SELECT 
  'Tables' as check_type,
  CASE 
    WHEN COUNT(*) >= 20 THEN '✅ OK'
    ELSE '❌ ERREUR'
  END as status,
  COUNT(*) || ' tables trouvées (minimum 20 attendues)' as details
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Liste des tables critiques
SELECT 
  'Table: ' || table_name as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
        AND t.table_name = tables_to_check.table_name
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status,
  '' as details
FROM (VALUES 
  ('alerts'),
  ('meetings'),
  ('department_settings'),
  ('document_type_metadata'),
  ('fiche_suivi_history'),
  ('profiles'),
  ('themes'),
  ('defense_sessions'),
  ('documents'),
  ('final_grades')
) AS tables_to_check(table_name);


-- ===== SECTION 2: VÉRIFICATION DES COLONNES AJOUTÉES =====
\echo ''
\echo '=== VÉRIFICATION DES COLONNES AJOUTÉES ==='

SELECT 
  'Colonne: plagiarism_reports.report_submission_id' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'plagiarism_reports' 
        AND column_name = 'report_submission_id'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status,
  '' as details
UNION ALL
SELECT 
  'Colonne: final_grades.defense_session_id',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'final_grades' 
        AND column_name = 'defense_session_id'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END,
  ''
UNION ALL
SELECT 
  'Colonne: themes.thesis_topic_id',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'themes' 
        AND column_name = 'thesis_topic_id'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END,
  ''
UNION ALL
SELECT 
  'Colonne: report_submissions.theme_id',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'report_submissions' 
        AND column_name = 'theme_id'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END,
  ''
UNION ALL
SELECT 
  'Colonne: defense_sessions.department_id',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'defense_sessions' 
        AND column_name = 'department_id'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END,
  '';


-- ===== SECTION 3: VÉRIFICATION DES FONCTIONS RPC =====
\echo ''
\echo '=== VÉRIFICATION DES FONCTIONS RPC ==='

SELECT 
  'Fonctions RPC' as check_type,
  CASE 
    WHEN COUNT(*) >= 20 THEN '✅ OK'
    ELSE '⚠️ WARNING'
  END as status,
  COUNT(*) || ' fonctions trouvées (minimum 20 attendues)' as details
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f';

-- Liste des fonctions critiques
SELECT 
  'Fonction: ' || function_name as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' 
        AND p.proname = functions_to_check.function_name
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status,
  '' as details
FROM (VALUES 
  ('check_final_submission_eligibility'),
  ('get_supervisor_performance'),
  ('get_department_statistics'),
  ('calculate_final_grade'),
  ('get_student_workflow_status'),
  ('create_alert'),
  ('get_meeting_statistics'),
  ('verify_schema_integrity'),
  ('generate_system_report'),
  ('check_room_conflicts')
) AS functions_to_check(function_name);


-- ===== SECTION 4: VÉRIFICATION DES TRIGGERS =====
\echo ''
\echo '=== VÉRIFICATION DES TRIGGERS ==='

SELECT 
  'Triggers' as check_type,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✅ OK'
    ELSE '⚠️ WARNING'
  END as status,
  COUNT(*) || ' triggers trouvés (minimum 10 attendus)' as details
FROM pg_trigger
WHERE tgrelid IN (
  SELECT oid FROM pg_class WHERE relnamespace = (
    SELECT oid FROM pg_namespace WHERE nspname = 'public'
  )
)
AND tgname NOT LIKE 'RI_%';

-- Liste des triggers critiques
SELECT 
  'Trigger: ' || trigger_name as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_schema = 'public' 
        AND trigger_name = triggers_to_check.trigger_name
    ) THEN '✅ Existe'
    ELSE '❌ Manquant'
  END as status,
  '' as details
FROM (VALUES 
  ('trigger_document_rejected_alert'),
  ('trigger_defense_scheduled_alert'),
  ('trigger_validation_required_alert'),
  ('trigger_plagiarism_failed_alert'),
  ('trigger_meeting_scheduled_alert'),
  ('trigger_capture_fiche_suivi_changes'),
  ('trigger_validate_defense_prerequisites'),
  ('trigger_validate_defense_scheduling')
) AS triggers_to_check(trigger_name);


-- ===== SECTION 5: VÉRIFICATION DES POLITIQUES RLS =====
\echo ''
\echo '=== VÉRIFICATION DES POLITIQUES RLS ==='

SELECT 
  'Politiques RLS' as check_type,
  CASE 
    WHEN COUNT(*) >= 40 THEN '✅ OK'
    ELSE '⚠️ WARNING'
  END as status,
  COUNT(*) || ' politiques trouvées (minimum 40 attendues)' as details
FROM pg_policies
WHERE schemaname = 'public';

-- Tables avec RLS activé
SELECT 
  'RLS activé sur: ' || tablename as check_type,
  CASE 
    WHEN rowsecurity THEN '✅ Activé'
    ELSE '❌ Désactivé'
  END as status,
  '' as details
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'alerts', 'meetings', 'department_settings', 'themes', 
    'documents', 'defense_sessions', 'final_grades', 
    'fiche_suivi', 'report_submissions', 'plagiarism_reports'
  )
ORDER BY tablename;


-- ===== SECTION 6: VÉRIFICATION DES INDEX =====
\echo ''
\echo '=== VÉRIFICATION DES INDEX ==='

SELECT 
  'Index' as check_type,
  CASE 
    WHEN COUNT(*) >= 50 THEN '✅ OK'
    ELSE '⚠️ WARNING'
  END as status,
  COUNT(*) || ' index trouvés (minimum 50 attendus)' as details
FROM pg_indexes
WHERE schemaname = 'public';

-- Index critiques
SELECT 
  'Index: ' || index_name as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' 
        AND indexname = indexes_to_check.index_name
    ) THEN '✅ Existe'
    ELSE '❌ Manquant'
  END as status,
  '' as details
FROM (VALUES 
  ('idx_alerts_user_id'),
  ('idx_meetings_student_id'),
  ('idx_department_settings_department'),
  ('idx_themes_status'),
  ('idx_documents_student_status'),
  ('idx_defense_sessions_date'),
  ('idx_fiche_suivi_student_date'),
  ('idx_profiles_department_id')
) AS indexes_to_check(index_name);


-- ===== SECTION 7: VÉRIFICATION DES VUES =====
\echo ''
\echo '=== VÉRIFICATION DES VUES ==='

SELECT 
  'Vue: ' || view_name as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public' 
        AND table_name = views_to_check.view_name
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status,
  '' as details
FROM (VALUES 
  ('system_statistics'),
  ('student_progress'),
  ('supervisor_workload'),
  ('defenses')
) AS views_to_check(view_name);


-- ===== SECTION 8: INTÉGRITÉ DES DONNÉES =====
\echo ''
\echo '=== VÉRIFICATION DE L''INTÉGRITÉ DES DONNÉES ==='

-- Utiliser la fonction de vérification si elle existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'verify_schema_integrity'
  ) THEN
    RAISE NOTICE 'Exécution de verify_schema_integrity()...';
    PERFORM verify_schema_integrity();
  ELSE
    RAISE WARNING 'La fonction verify_schema_integrity() n''existe pas encore';
  END IF;
END $$;


-- ===== SECTION 9: STATISTIQUES GLOBALES =====
\echo ''
\echo '=== STATISTIQUES GLOBALES ==='

SELECT 
  'Taille de la base' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value;

SELECT 
  'Nombre de tables' as metric,
  COUNT(*)::TEXT as value
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT 
  'Nombre de fonctions' as metric,
  COUNT(*)::TEXT as value
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f';

SELECT 
  'Nombre de triggers' as metric,
  COUNT(*)::TEXT as value
FROM pg_trigger
WHERE tgrelid IN (
  SELECT oid FROM pg_class WHERE relnamespace = (
    SELECT oid FROM pg_namespace WHERE nspname = 'public'
  )
)
AND tgname NOT LIKE 'RI_%';

SELECT 
  'Nombre d''index' as metric,
  COUNT(*)::TEXT as value
FROM pg_indexes
WHERE schemaname = 'public';

SELECT 
  'Nombre de politiques RLS' as metric,
  COUNT(*)::TEXT as value
FROM pg_policies
WHERE schemaname = 'public';


-- ===== SECTION 10: TOP 10 DES TABLES PAR TAILLE =====
\echo ''
\echo '=== TOP 10 DES TABLES PAR TAILLE ==='

SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;


-- ===== RÉSUMÉ FINAL =====
\echo ''
\echo '=== RÉSUMÉ FINAL ==='
\echo 'Si tous les checks sont ✅, les migrations ont été appliquées avec succès!'
\echo 'Si vous voyez des ❌, vérifiez les migrations correspondantes.'
\echo 'Les ⚠️ WARNING sont acceptables mais à surveiller.'
