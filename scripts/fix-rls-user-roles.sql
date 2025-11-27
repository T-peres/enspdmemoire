-- =====================================================
-- CORRECTION RLS - Permettre aux chefs de voir les rôles
-- =====================================================

-- 1. Vérifier les policies actuelles
SELECT 
  '=== POLICIES ACTUELLES ===' as section;

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_roles';

-- 2. Ajouter une policy pour les chefs de département
CREATE POLICY "Department heads can view all roles in their department"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'department_head'
    )
  );

-- 3. Ajouter une policy pour les admins
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

-- 4. Vérifier les nouvelles policies
SELECT 
  '' as spacer,
  '=== NOUVELLES POLICIES ===' as section;

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- =====================================================
-- RÉSULTAT ATTENDU
-- =====================================================
-- Après ce script, les chefs de département pourront:
-- - Voir leur propre rôle
-- - Voir les rôles de tous les utilisateurs
--
-- Ensuite:
-- 1. Rafraîchir la page (F5)
-- 2. Les listes devraient maintenant être remplies
-- =====================================================
