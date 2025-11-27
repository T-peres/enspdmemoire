-- =====================================================
-- CORRECTION RLS - Permettre la lecture des profils
-- =====================================================

-- 1. Vérifier les policies actuelles sur profiles
SELECT 
  '=== POLICIES ACTUELLES SUR PROFILES ===' as section;

SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 2. Ajouter une policy pour permettre aux utilisateurs authentifiés de voir tous les profils
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Vérifier les nouvelles policies
SELECT 
  '' as spacer,
  '=== NOUVELLES POLICIES ===' as section;

SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- =====================================================
-- RÉSULTAT ATTENDU
-- =====================================================
-- Après ce script:
-- - Tous les utilisateurs authentifiés peuvent voir tous les profils
-- - Les chefs de département peuvent voir les étudiants et encadreurs
--
-- Ensuite:
-- 1. Rafraîchir la page (F5)
-- 2. Les listes devraient être remplies
-- =====================================================
