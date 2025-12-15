-- =====================================================
-- Script: Vérification des politiques RLS sur supervisor_assignments
-- Description: Diagnostiquer les problèmes d'attribution d'encadreurs
-- =====================================================

-- 1. Vérifier si RLS est activé sur supervisor_assignments
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'supervisor_assignments';

-- 2. Lister toutes les politiques RLS sur supervisor_assignments
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'supervisor_assignments'
ORDER BY policyname;

-- 3. Vérifier la structure de la table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'supervisor_assignments'
ORDER BY ordinal_position;

-- 4. Vérifier les contraintes
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'supervisor_assignments'::regclass;

-- 5. Vérifier les index
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'supervisor_assignments';

-- 6. Compter les attributions existantes
SELECT 
  COUNT(*) as total_assignments,
  COUNT(*) FILTER (WHERE is_active = TRUE) as active_assignments,
  COUNT(*) FILTER (WHERE is_active = FALSE) as inactive_assignments
FROM supervisor_assignments;

-- 7. Vérifier les rôles des utilisateurs
SELECT 
  ur.role,
  COUNT(*) as user_count
FROM user_roles ur
GROUP BY ur.role
ORDER BY ur.role;

-- 8. Vérifier les étudiants et encadreurs par département
SELECT 
  d.code as department,
  d.name,
  COUNT(DISTINCT CASE WHEN ur.role = 'student' THEN p.id END) as students,
  COUNT(DISTINCT CASE WHEN ur.role = 'supervisor' THEN p.id END) as supervisors,
  COUNT(DISTINCT CASE WHEN ur.role = 'department_head' THEN p.id END) as dept_heads
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY d.id, d.code, d.name
ORDER BY d.code;

-- 9. Vérifier les attributions par département
SELECT 
  d.code as department,
  d.name,
  COUNT(*) as total_assignments,
  COUNT(*) FILTER (WHERE sa.is_active = TRUE) as active_assignments
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
LEFT JOIN supervisor_assignments sa ON sa.student_id = p.id
GROUP BY d.id, d.code, d.name
ORDER BY d.code;

-- 10. Tester les permissions pour l'utilisateur actuel
-- Note: Remplacer auth.uid() par l'ID réel de l'utilisateur pour tester
SELECT 
  'Current user ID' as info,
  auth.uid() as user_id;

SELECT 
  'Current user roles' as info,
  array_agg(role) as roles
FROM user_roles
WHERE user_id = auth.uid();

SELECT 
  'Current user department' as info,
  department_id,
  d.code,
  d.name
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
WHERE p.id = auth.uid();
