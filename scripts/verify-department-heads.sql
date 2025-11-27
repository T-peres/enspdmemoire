-- =====================================================
-- VÉRIFICATION DES COMPTES CHEFS DE DÉPARTEMENT
-- =====================================================

-- 1. Vérifier les utilisateurs auth créés
SELECT 
  '=== UTILISATEURS AUTH ===' as section,
  '' as spacer;

SELECT 
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✓ Confirmé'
    ELSE '✗ Non confirmé'
  END as statut
FROM auth.users
WHERE email LIKE 'chef.%@enspd.cm'
ORDER BY email;

-- 2. Vérifier les profils créés avec départements
SELECT 
  '' as spacer,
  '=== PROFILS AVEC DÉPARTEMENTS ===' as section,
  '' as spacer2;

SELECT 
  p.email,
  p.first_name,
  p.last_name,
  d.code as dept_code,
  d.name as dept_name,
  CASE 
    WHEN p.department_id IS NOT NULL THEN '✓ Département assigné'
    ELSE '✗ Pas de département'
  END as statut_dept
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
WHERE p.email LIKE 'chef.%@enspd.cm'
ORDER BY d.code;

-- 3. Vérifier les rôles attribués
SELECT 
  '' as spacer,
  '=== RÔLES ATTRIBUÉS ===' as section,
  '' as spacer2;

SELECT 
  p.email,
  d.code as dept_code,
  ur.role,
  ur.assigned_at,
  CASE 
    WHEN ur.role = 'department_head' THEN '✓ Rôle correct'
    ELSE '✗ Rôle incorrect'
  END as statut_role
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email LIKE 'chef.%@enspd.cm'
ORDER BY d.code;

-- 4. Résumé global
SELECT 
  '' as spacer,
  '=== RÉSUMÉ GLOBAL ===' as section,
  '' as spacer2;

SELECT 
  'Total chefs créés' as indicateur,
  COUNT(DISTINCT p.id) as valeur
FROM profiles p
WHERE p.email LIKE 'chef.%@enspd.cm'

UNION ALL

SELECT 
  'Avec département assigné' as indicateur,
  COUNT(DISTINCT p.id) as valeur
FROM profiles p
WHERE p.email LIKE 'chef.%@enspd.cm'
  AND p.department_id IS NOT NULL

UNION ALL

SELECT 
  'Avec rôle department_head' as indicateur,
  COUNT(DISTINCT ur.user_id) as valeur
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE p.email LIKE 'chef.%@enspd.cm'
  AND ur.role = 'department_head'

UNION ALL

SELECT 
  'Comptes complets (auth + profil + rôle)' as indicateur,
  COUNT(DISTINCT p.id) as valeur
FROM profiles p
JOIN auth.users au ON au.id = p.id
JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email LIKE 'chef.%@enspd.cm'
  AND p.department_id IS NOT NULL
  AND ur.role = 'department_head';

-- 5. Vérifier la correspondance département ↔ chef
SELECT 
  '' as spacer,
  '=== CORRESPONDANCE DÉPARTEMENT ↔ CHEF ===' as section,
  '' as spacer2;

SELECT 
  d.code as dept_code,
  d.name as dept_name,
  COALESCE(p.email, '✗ Pas de chef') as chef_email,
  COALESCE(p.first_name || ' ' || p.last_name, 'N/A') as chef_nom,
  CASE 
    WHEN p.id IS NOT NULL AND ur.role = 'department_head' THEN '✓ Complet'
    WHEN p.id IS NOT NULL THEN '⚠ Profil sans rôle'
    ELSE '✗ Pas de chef'
  END as statut
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id AND p.email LIKE 'chef.%@enspd.cm'
LEFT JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'department_head'
ORDER BY d.code;

-- 6. Détection des problèmes
SELECT 
  '' as spacer,
  '=== PROBLÈMES DÉTECTÉS ===' as section,
  '' as spacer2;

-- Chefs sans département
SELECT 
  'Chef sans département' as probleme,
  p.email,
  'Assigner un department_id' as solution
FROM profiles p
WHERE p.email LIKE 'chef.%@enspd.cm'
  AND p.department_id IS NULL

UNION ALL

-- Chefs sans rôle
SELECT 
  'Chef sans rôle department_head' as probleme,
  p.email,
  'Ajouter le rôle dans user_roles' as solution
FROM profiles p
WHERE p.email LIKE 'chef.%@enspd.cm'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'department_head'
  )

UNION ALL

-- Départements sans chef
SELECT 
  'Département sans chef' as probleme,
  d.code || ' - ' || d.name as email,
  'Créer un chef pour ce département' as solution
FROM departments d
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.department_id = d.id 
    AND p.email LIKE 'chef.%@enspd.cm'
);

-- 7. Test de connexion (informations)
SELECT 
  '' as spacer,
  '=== INFORMATIONS DE CONNEXION ===' as section,
  '' as spacer2;

SELECT 
  d.code as dept,
  'chef.' || LOWER(d.code) || '@enspd.cm' as email,
  'Chef' || UPPER(d.code) || '2024!' as mot_de_passe,
  CASE 
    WHEN p.id IS NOT NULL THEN '✓ Compte existe'
    ELSE '✗ Compte manquant'
  END as statut
FROM departments d
LEFT JOIN profiles p ON p.email = 'chef.' || LOWER(d.code) || '@enspd.cm'
ORDER BY d.code;

-- 8. Statistiques par département
SELECT 
  '' as spacer,
  '=== STATISTIQUES PAR DÉPARTEMENT ===' as section,
  '' as spacer2;

SELECT 
  d.code as dept_code,
  d.name as dept_name,
  COUNT(DISTINCT CASE WHEN ur_student.role = 'student' THEN p_student.id END) as nb_etudiants,
  COUNT(DISTINCT CASE WHEN ur_supervisor.role = 'supervisor' THEN p_supervisor.id END) as nb_encadreurs,
  COUNT(DISTINCT sa.id) as nb_attributions,
  COUNT(DISTINCT tt.id) as nb_sujets
FROM departments d
LEFT JOIN profiles p_student ON p_student.department_id = d.id
LEFT JOIN user_roles ur_student ON ur_student.user_id = p_student.id AND ur_student.role = 'student'
LEFT JOIN profiles p_supervisor ON p_supervisor.department_id = d.id
LEFT JOIN user_roles ur_supervisor ON ur_supervisor.user_id = p_supervisor.id AND ur_supervisor.role = 'supervisor'
LEFT JOIN supervisor_assignments sa ON sa.supervisor_id = p_supervisor.id AND sa.is_active = true
LEFT JOIN thesis_topics tt ON tt.department_id = d.id
GROUP BY d.code, d.name
ORDER BY d.code;

-- =====================================================
-- RÉSULTAT ATTENDU
-- =====================================================
-- ✓ 10 utilisateurs auth créés
-- ✓ 10 profils créés avec département assigné
-- ✓ 10 rôles department_head attribués
-- ✓ Chaque département a son chef
-- ✓ Aucun problème détecté
-- =====================================================
