-- =====================================================
-- CORRECTION - AJOUTER LES RÔLES MANQUANTS
-- =====================================================
-- Ce script ajoute les rôles dans user_roles pour tous les utilisateurs

-- 1. Vérifier l'état actuel
SELECT 
  '=== ÉTAT ACTUEL ===' as section;

SELECT 
  'Total profils' as type,
  COUNT(*) as nombre
FROM profiles

UNION ALL

SELECT 
  'Total rôles' as type,
  COUNT(*) as nombre
FROM user_roles;

-- 2. Ajouter les rôles pour les étudiants
INSERT INTO user_roles (user_id, role)
SELECT 
  p.id,
  'student'::app_role
FROM profiles p
WHERE p.email LIKE '%etudiant%'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'student'
  );

-- 3. Ajouter les rôles pour les encadreurs
INSERT INTO user_roles (user_id, role)
SELECT 
  p.id,
  'supervisor'::app_role
FROM profiles p
WHERE p.email LIKE '%encadreur%'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'supervisor'
  );

-- 4. Ajouter les rôles pour les chefs de département
INSERT INTO user_roles (user_id, role)
SELECT 
  p.id,
  'department_head'::app_role
FROM profiles p
WHERE p.email LIKE 'chef.%@enspd.cm'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'department_head'
  );

-- 5. Vérification après correction
SELECT 
  '' as spacer,
  '=== APRÈS CORRECTION ===' as section;

SELECT 
  ur.role,
  COUNT(*) as nombre
FROM user_roles ur
GROUP BY ur.role
ORDER BY ur.role;

-- 6. Détail par type d'utilisateur
SELECT 
  '' as spacer,
  '=== DÉTAIL PAR TYPE ===' as section;

SELECT 
  CASE 
    WHEN p.email LIKE '%etudiant%' THEN 'Étudiant'
    WHEN p.email LIKE '%encadreur%' THEN 'Encadreur'
    WHEN p.email LIKE 'chef.%' THEN 'Chef de département'
    ELSE 'Autre'
  END as type,
  p.email,
  COALESCE(ur.role::text, '❌ PAS DE RÔLE') as role,
  d.code as dept
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
ORDER BY type, p.email;

-- 7. Résumé final
SELECT 
  '' as spacer,
  '=== RÉSUMÉ FINAL ===' as section;

SELECT 
  'Étudiants avec rôle' as type,
  COUNT(DISTINCT ur.user_id) as nombre
FROM user_roles ur
WHERE ur.role = 'student'

UNION ALL

SELECT 
  'Encadreurs avec rôle' as type,
  COUNT(DISTINCT ur.user_id) as nombre
FROM user_roles ur
WHERE ur.role = 'supervisor'

UNION ALL

SELECT 
  'Chefs avec rôle' as type,
  COUNT(DISTINCT ur.user_id) as nombre
FROM user_roles ur
WHERE ur.role = 'department_head';

-- =====================================================
-- RÉSULTAT ATTENDU
-- =====================================================
-- Après ce script, vous devriez voir:
-- - X étudiants avec le rôle 'student'
-- - Y encadreurs avec le rôle 'supervisor'
-- - 10 chefs avec le rôle 'department_head'
--
-- Ensuite:
-- 1. Rafraîchir la page (F5)
-- 2. Les listes devraient maintenant être remplies
-- =====================================================
