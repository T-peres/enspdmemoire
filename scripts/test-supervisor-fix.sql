-- =====================================================
-- Script de test rapide pour vérifier le correctif
-- =====================================================

-- 1. Vérifier que RLS est activé
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'supervisor_assignments';

-- 2. Compter les politiques RLS
SELECT 
  COUNT(*) as policy_count,
  'Devrait être 6' as expected
FROM pg_policies
WHERE tablename = 'supervisor_assignments';

-- 3. Lister les politiques
SELECT 
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename = 'supervisor_assignments'
ORDER BY policyname;

-- 4. Vérifier que la fonction create_notification existe
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'create_notification';

-- 5. Vérifier les colonnes de notifications
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 6. Vérifier l'index unique
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'supervisor_assignments'
  AND indexname = 'unique_active_supervisor_per_student';
