-- Script de vérification des données pour les dashboards
-- Exécuter ce script pour vérifier que toutes les tables et colonnes nécessaires existent

-- 1. Vérifier les tables principales
SELECT 
  'Tables Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN '✓'
    ELSE '✗'
  END as profiles,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') THEN '✓'
    ELSE '✗'
  END as themes,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN '✓'
    ELSE '✗'
  END as documents,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fiche_suivi') THEN '✓'
    ELSE '✗'
  END as fiche_suivi,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meetings') THEN '✓'
    ELSE '✗'
  END as meetings,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alerts') THEN '✓'
    ELSE '✗'
  END as alerts,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN '✓'
    ELSE '✗'
  END as messages;

-- 2. Vérifier les colonnes critiques
SELECT 
  'Columns Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiche_suivi' AND column_name = 'overall_progress') THEN '✓'
    ELSE '✗'
  END as overall_progress,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiche_suivi' AND column_name = 'validation_status') THEN '✓'
    ELSE '✗'
  END as validation_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alerts' AND column_name = 'is_read') THEN '✓'
    ELSE '✗'
  END as alerts_is_read,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_read') THEN '✓'
    ELSE '✗'
  END as messages_is_read,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supervisor_assignments' AND column_name = 'is_active') THEN '✓'
    ELSE '✗'
  END as is_active;

-- 3. Compter les données par table
SELECT 
  'Data Count' as check_type,
  (SELECT COUNT(*) FROM profiles) as profiles_count,
  (SELECT COUNT(*) FROM themes) as themes_count,
  (SELECT COUNT(*) FROM documents) as documents_count,
  (SELECT COUNT(*) FROM fiche_suivi) as fiche_suivi_count,
  (SELECT COUNT(*) FROM meetings) as meetings_count,
  (SELECT COUNT(*) FROM alerts) as alerts_count,
  (SELECT COUNT(*) FROM messages) as messages_count,
  (SELECT COUNT(*) FROM supervisor_assignments) as assignments_count;

-- 4. Vérifier les index
SELECT 
  'Indexes Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fiche_suivi_student_id') THEN '✓'
    ELSE '✗'
  END as idx_fiche_suivi,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_student_id') THEN '✓'
    ELSE '✗'
  END as idx_documents,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_themes_student_id') THEN '✓'
    ELSE '✗'
  END as idx_themes,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_alerts_user_id_is_read') THEN '✓'
    ELSE '✗'
  END as idx_alerts;

-- 5. Vérifier les rôles utilisateurs
SELECT 
  'User Roles' as check_type,
  (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE role = 'student') as students,
  (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE role = 'supervisor') as supervisors,
  (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE role = 'department_head') as dept_heads,
  (SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE role = 'jury') as jury_members;

-- 6. Vérifier les départements
SELECT 
  'Departments' as check_type,
  COUNT(*) as total_departments,
  STRING_AGG(code, ', ') as department_codes
FROM departments;

-- 7. Statistiques par statut
SELECT 
  'Theme Status' as check_type,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
FROM themes;

-- 8. Vérifier les relations
SELECT 
  'Relations Check' as check_type,
  (SELECT COUNT(*) FROM themes WHERE supervisor_id IS NOT NULL) as themes_with_supervisor,
  (SELECT COUNT(*) FROM themes WHERE student_id IS NOT NULL) as themes_with_student,
  (SELECT COUNT(*) FROM documents WHERE student_id IS NOT NULL) as documents_with_student,
  (SELECT COUNT(*) FROM supervisor_assignments WHERE supervisor_id IS NOT NULL AND student_id IS NOT NULL) as valid_assignments;

-- 9. Vérifier les données récentes (dernières 24h)
SELECT 
  'Recent Activity' as check_type,
  (SELECT COUNT(*) FROM themes WHERE created_at > NOW() - INTERVAL '24 hours') as new_themes,
  (SELECT COUNT(*) FROM documents WHERE created_at > NOW() - INTERVAL '24 hours') as new_documents,
  (SELECT COUNT(*) FROM meetings WHERE created_at > NOW() - INTERVAL '24 hours') as new_meetings,
  (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 hours') as new_messages;

-- 10. Résumé final
SELECT 
  '=== SUMMARY ===' as summary,
  CASE 
    WHEN (SELECT COUNT(*) FROM profiles) > 0 
      AND (SELECT COUNT(*) FROM themes) > 0 
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiche_suivi' AND column_name = 'overall_progress')
    THEN '✓ System Ready'
    ELSE '✗ Missing Data or Columns'
  END as status;
