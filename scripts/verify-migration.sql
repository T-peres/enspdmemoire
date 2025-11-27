-- =====================================================
-- SCRIPT DE VÉRIFICATION DE LA MIGRATION
-- =====================================================
-- Ce script vérifie que toutes les tables, types et fonctions
-- ont été correctement créés
-- =====================================================

\echo '========================================='
\echo 'VÉRIFICATION DE LA MIGRATION'
\echo '========================================='
\echo ''

-- 1. Vérifier les types énumérés
\echo '1. Types énumérés :'
SELECT 
  typname as "Type",
  CASE 
    WHEN typname = 'app_role' THEN '✓'
    WHEN typname = 'theme_status' THEN '✓'
    WHEN typname = 'document_type' THEN '✓'
    WHEN typname = 'document_status' THEN '✓'
    WHEN typname = 'plagiarism_status' THEN '✓'
    WHEN typname = 'jury_decision' THEN '✓'
    WHEN typname = 'archive_status' THEN '✓'
    ELSE '?'
  END as "Statut"
FROM pg_type 
WHERE typname IN (
  'app_role', 'theme_status', 'document_type', 
  'document_status', 'plagiarism_status', 
  'jury_decision', 'archive_status'
)
ORDER BY typname;

\echo ''
\echo '2. Tables créées :'
SELECT 
  table_name as "Table",
  '✓' as "Statut"
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN (
    'departments',
    'profiles',
    'user_roles',
    'supervisor_assignments',
    'themes',
    'documents',
    'fiche_suivi',
    'plagiarism_reports',
    'jury_members',
    'jury_decisions',
    'archives',
    'notifications',
    'activity_logs',
    'system_settings'
  )
ORDER BY table_name;

\echo ''
\echo '3. Départements de l''ENSPD :'
SELECT 
  code as "Code",
  name as "Nom",
  '✓' as "Statut"
FROM departments 
ORDER BY code;

\echo ''
\echo '4. Fonctions créées :'
SELECT 
  routine_name as "Fonction",
  '✓' as "Statut"
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_updated_at_column',
    'create_fiche_suivi_on_theme_approval',
    'create_notification'
  )
ORDER BY routine_name;

\echo ''
\echo '5. Paramètres système :'
SELECT 
  key as "Paramètre",
  value as "Valeur",
  '✓' as "Statut"
FROM system_settings
ORDER BY key;

\echo ''
\echo '6. Utilisateurs de test :'
SELECT 
  email as "Email",
  first_name || ' ' || last_name as "Nom",
  d.code as "Département",
  '✓' as "Statut"
FROM profiles p
LEFT JOIN departments d ON p.department_id = d.id
WHERE email LIKE '%@enspd.cm'
ORDER BY email;

\echo ''
\echo '7. Rôles des utilisateurs :'
SELECT 
  p.email as "Email",
  ur.role as "Rôle",
  '✓' as "Statut"
FROM user_roles ur
JOIN profiles p ON ur.user_id = p.id
WHERE p.email LIKE '%@enspd.cm'
ORDER BY p.email, ur.role;

\echo ''
\echo '========================================='
\echo 'RÉSUMÉ'
\echo '========================================='

-- Compter les éléments
SELECT 
  'Types énumérés' as "Élément",
  COUNT(*) as "Nombre",
  '7 attendus' as "Attendu",
  CASE WHEN COUNT(*) = 7 THEN '✓ OK' ELSE '✗ ERREUR' END as "Statut"
FROM pg_type 
WHERE typname IN (
  'app_role', 'theme_status', 'document_type', 
  'document_status', 'plagiarism_status', 
  'jury_decision', 'archive_status'
)

UNION ALL

SELECT 
  'Tables' as "Élément",
  COUNT(*) as "Nombre",
  '14 attendues' as "Attendu",
  CASE WHEN COUNT(*) = 14 THEN '✓ OK' ELSE '✗ ERREUR' END as "Statut"
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN (
    'departments', 'profiles', 'user_roles', 'supervisor_assignments',
    'themes', 'documents', 'fiche_suivi', 'plagiarism_reports',
    'jury_members', 'jury_decisions', 'archives', 'notifications',
    'activity_logs', 'system_settings'
  )

UNION ALL

SELECT 
  'Départements' as "Élément",
  COUNT(*) as "Nombre",
  '10 attendus' as "Attendu",
  CASE WHEN COUNT(*) = 10 THEN '✓ OK' ELSE '✗ ERREUR' END as "Statut"
FROM departments

UNION ALL

SELECT 
  'Fonctions' as "Élément",
  COUNT(*) as "Nombre",
  '3 attendues' as "Attendu",
  CASE WHEN COUNT(*) = 3 THEN '✓ OK' ELSE '✗ ERREUR' END as "Statut"
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_updated_at_column',
    'create_fiche_suivi_on_theme_approval',
    'create_notification'
  )

UNION ALL

SELECT 
  'Utilisateurs de test' as "Élément",
  COUNT(*) as "Nombre",
  '8 attendus' as "Attendu",
  CASE WHEN COUNT(*) >= 8 THEN '✓ OK' ELSE '✗ ERREUR' END as "Statut"
FROM profiles
WHERE email LIKE '%@enspd.cm';

\echo ''
\echo '========================================='
\echo 'FIN DE LA VÉRIFICATION'
\echo '========================================='
