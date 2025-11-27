-- =====================================================
-- TEST DE LA REQUÊTE EXACTE DE L'INTERFACE
-- =====================================================
-- Ce script simule exactement ce que fait l'interface
-- pour charger les encadreurs

-- 1. Simuler la connexion du chef GIT
SELECT 
  '=== 1. CHEF CONNECTÉ ===' as section;

SELECT 
  id as user_id,
  email,
  first_name || ' ' || last_name as nom,
  department_id
FROM profiles
WHERE email = 'chef.git@enspd.cm';

-- 2. Récupérer tous les user_ids avec le rôle supervisor
SELECT 
  '' as spacer,
  '=== 2. TOUS LES SUPERVISORS (user_roles) ===' as section;

SELECT 
  user_id,
  role,
  assigned_at
FROM user_roles
WHERE role = 'supervisor'
ORDER BY assigned_at DESC
LIMIT 10;

-- 3. Joindre avec les profils
SELECT 
  '' as spacer,
  '=== 3. PROFILS DES SUPERVISORS ===' as section;

SELECT 
  ur.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.department_id,
  d.code as dept_code
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
LEFT JOIN departments d ON d.id = p.department_id
WHERE ur.role = 'supervisor'
ORDER BY p.last_name
LIMIT 10;

-- 4. Filtrer par département GIT (ce que fait l'interface)
SELECT 
  '' as spacer,
  '=== 4. SUPERVISORS DU DÉPARTEMENT GIT ===' as section;

WITH chef_dept AS (
  SELECT department_id 
  FROM profiles 
  WHERE email = 'chef.git@enspd.cm'
)
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.department_id,
  d.code as dept_code
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
LEFT JOIN departments d ON d.id = p.department_id
WHERE ur.role = 'supervisor'
  AND p.department_id = (SELECT department_id FROM chef_dept)
ORDER BY p.last_name;

-- 5. Compter les résultats
SELECT 
  '' as spacer,
  '=== 5. NOMBRE D''ENCADREURS PAR DÉPARTEMENT ===' as section;

SELECT 
  d.code as dept,
  COUNT(DISTINCT p.id) as nb_encadreurs
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
JOIN departments d ON d.id = p.department_id
WHERE ur.role = 'supervisor'
GROUP BY d.code
ORDER BY d.code;

-- 6. Vérifier les étudiants aussi
SELECT 
  '' as spacer,
  '=== 6. ÉTUDIANTS DU DÉPARTEMENT GIT ===' as section;

WITH chef_dept AS (
  SELECT department_id 
  FROM profiles 
  WHERE email = 'chef.git@enspd.cm'
)
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.student_id,
  d.code as dept_code
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
LEFT JOIN departments d ON d.id = p.department_id
WHERE ur.role = 'student'
  AND p.department_id = (SELECT department_id FROM chef_dept)
ORDER BY p.last_name;

-- 7. Résumé pour le chef GIT
SELECT 
  '' as spacer,
  '=== 7. RÉSUMÉ POUR LE CHEF GIT ===' as section;

WITH chef_dept AS (
  SELECT department_id 
  FROM profiles 
  WHERE email = 'chef.git@enspd.cm'
)
SELECT 
  'Département' as info,
  d.code as valeur
FROM departments d
WHERE d.id = (SELECT department_id FROM chef_dept)

UNION ALL

SELECT 
  'Nombre d''étudiants' as info,
  COUNT(DISTINCT p.id)::text as valeur
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'student'
  AND p.department_id = (SELECT department_id FROM chef_dept)

UNION ALL

SELECT 
  'Nombre d''encadreurs' as info,
  COUNT(DISTINCT p.id)::text as valeur
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'supervisor'
  AND p.department_id = (SELECT department_id FROM chef_dept);

-- =====================================================
-- RÉSULTAT ATTENDU
-- =====================================================
-- Section 4 devrait montrer 3 encadreurs GIT:
-- - encadreur1.git@enspd.cm
-- - encadreur2.git@enspd.cm  
-- - encadreur1@enspd.cm (Jean Dupont)
--
-- Si ces 3 encadreurs apparaissent ici mais pas dans l'interface,
-- le problème est dans le frontend (cache ou code React)
-- =====================================================
