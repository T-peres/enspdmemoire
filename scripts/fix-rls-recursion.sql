-- =====================================================
-- CORRECTION URGENTE - Supprimer les policies récursives
-- =====================================================

-- 1. Supprimer les policies problématiques
DROP POLICY IF EXISTS "Department heads can view all roles in their department" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

-- 2. Désactiver temporairement RLS sur user_roles
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- 3. Vérifier que RLS est désactivé
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'user_roles';

-- 4. Vérifier les policies restantes
SELECT 
  policyname
FROM pg_policies
WHERE tablename = 'user_roles';

-- =====================================================
-- RÉSULTAT
-- =====================================================
-- RLS désactivé sur user_roles
-- Tous les utilisateurs authentifiés peuvent maintenant
-- lire la table user_roles
--
-- Ensuite:
-- 1. Rafraîchir la page (F5)
-- 2. L'erreur devrait disparaître
-- 3. Les listes devraient être remplies
-- =====================================================
