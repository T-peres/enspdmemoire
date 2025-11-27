-- =====================================================
-- DIAGNOSTIC COMPLET - ENCADREURS NON VISIBLES
-- =====================================================

-- 1. Vérifier les encadreurs dans auth.users
SELECT 
  '=== 1. UTILISATEURS AUTH ===' as section;

SELECT 
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email LIKE '%encadreur%'
ORDER BY email;

-- 2. Vérifier les profils des encadreurs
SELECT 
  '' as spacer,
  '=== 2. PROFILS ENCADREURS ===' as section;

SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.department_id,
  d.code as dept_code,
  d.name as dept_name
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
WHERE p.email LIKE '%encadreur%'
ORDER BY p.email;

-- 3. Vérifier les rôles des encadreurs
SELECT 
  '' as spacer,
  '=== 3. RÔLES ENCADREURS ===' as section;

SELECT 
  p.email,
  ur.role,
  ur.assigned_at,
  CASE 
    WHEN ur.role = 'supervisor' THEN '✓ Rôle correct'
    WHEN ur.role IS NULL THEN '✗ PAS DE RÔLE'
    ELSE '⚠ Rôle incorrect: ' || ur.role
  END as statut
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email LIKE '%encadreur%'
ORDER BY p.email;

-- 4. Vérifier le chef de département connecté
SELECT 
  '' as spacer,
  '=== 4. CHEF DE DÉPARTEMENT GIT ===' as section;

SELECT 
  p.id as chef_id,
  p.email,
  p.first_name,
  p.last_name,
  p.department_id,
  d.code as dept_code,
  d.name as dept_name,
  ur.role
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email = 'chef.git@enspd.cm';

-- 5. Comparer les départements (chef vs encadreurs)
SELECT 
  '' as spacer,
  '=== 5. COMPARAISON DÉPARTEMENTS ===' as section;

SELECT 
  'Chef GIT' as type,
  p.email,
  d.code as dept_code,
  p.department_id as dept_id
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
WHERE p.email = 'chef.git@enspd.cm'

UNION ALL

SELECT 
  'Encadreur' as type,
  p.email,
  d.code as dept_code,
  p.department_id as dept_id
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
WHERE p.email LIKE '%encadreur%'
ORDER BY type, email;

-- 6. Vérifier si les encadreurs ont le bon département
SELECT 
  '' as spacer,
  '=== 6. PROBLÈME DÉTECTÉ ===' as section;

SELECT 
  p.email,
  CASE 
    WHEN p.department_id IS NULL THEN '✗ PAS DE DÉPARTEMENT'
    WHEN ur.role IS NULL THEN '✗ PAS DE RÔLE'
    WHEN ur.role != 'supervisor' THEN '✗ MAUVAIS RÔLE: ' || ur.role
    WHEN p.department_id != (SELECT department_id FROM profiles WHERE email = 'chef.git@enspd.cm') 
      THEN '✗ DÉPARTEMENT DIFFÉRENT'
    ELSE '✓ OK'
  END as probleme
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email LIKE '%encadreur%'
ORDER BY p.email;

-- 7. Requête exacte utilisée par l'interface
SELECT 
  '' as spacer,
  '=== 7. REQUÊTE INTERFACE (simulation) ===' as section;

-- Simuler ce que fait SupervisorAssignmentForm.tsx
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

-- 8. Compter les utilisateurs par rôle et département
SELECT 
  '' as spacer,
  '=== 8. STATISTIQUES ===' as section;

SELECT 
  d.code as dept,
  COUNT(DISTINCT CASE WHEN ur.role = 'supervisor' THEN p.id END) as encadreurs,
  COUNT(DISTINCT CASE WHEN ur.role = 'student' THEN p.id END) as etudiants,
  COUNT(DISTINCT CASE WHEN ur.role = 'department_head' THEN p.id END) as chefs
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY d.code
ORDER BY d.code;

-- =====================================================
-- SOLUTION AUTOMATIQUE
-- =====================================================
SELECT 
  '' as spacer,
  '=== 9. SOLUTION AUTOMATIQUE ===' as section;

-- Si les encadreurs n'ont pas de département, les assigner à GIT
DO $$
DECLARE
  v_git_dept_id UUID;
  v_updated_count INT := 0;
BEGIN
  -- Récupérer l'ID du département GIT
  SELECT id INTO v_git_dept_id FROM departments WHERE code = 'GIT';
  
  -- Mettre à jour les encadreurs sans département
  UPDATE profiles
  SET department_id = v_git_dept_id
  WHERE email LIKE '%encadreur%'
    AND department_id IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count > 0 THEN
    RAISE NOTICE '✓ % encadreur(s) assigné(s) au département GIT', v_updated_count;
  ELSE
    RAISE NOTICE '⚠ Aucun encadreur sans département trouvé';
  END IF;
END $$;

-- Vérification finale
SELECT 
  '' as spacer,
  '=== 10. VÉRIFICATION FINALE ===' as section;

SELECT 
  p.email,
  p.first_name || ' ' || p.last_name as nom,
  d.code as dept,
  ur.role,
  CASE 
    WHEN p.department_id IS NOT NULL AND ur.role = 'supervisor' THEN '✓ OK - Devrait être visible'
    ELSE '✗ PROBLÈME'
  END as statut
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email LIKE '%encadreur%'
ORDER BY p.email;
