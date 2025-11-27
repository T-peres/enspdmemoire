-- =====================================================
-- SCRIPT DE DIAGNOSTIC - UTILISATEURS ET RÔLES
-- =====================================================

-- 1. Vérifier tous les utilisateurs dans auth.users
SELECT 
  '1. UTILISATEURS DANS AUTH.USERS' as section,
  COUNT(*) as total
FROM auth.users;

SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- 2. Vérifier tous les profils
SELECT 
  '2. PROFILS CRÉÉS' as section,
  COUNT(*) as total
FROM profiles;

SELECT 
  id,
  email,
  first_name,
  last_name,
  student_id,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 3. Vérifier tous les rôles attribués
SELECT 
  '3. RÔLES ATTRIBUÉS' as section,
  role,
  COUNT(*) as total
FROM user_roles
GROUP BY role
ORDER BY role;

-- 4. Vue complète : Utilisateurs avec leurs rôles
SELECT 
  '4. UTILISATEURS AVEC RÔLES' as section;

SELECT 
  p.email,
  p.first_name,
  p.last_name,
  p.student_id,
  array_agg(DISTINCT ur.role) as roles,
  COUNT(DISTINCT ur.role) as nombre_roles
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
GROUP BY p.id, p.email, p.first_name, p.last_name, p.student_id
ORDER BY p.email;

-- 5. Utilisateurs SANS rôle (problème potentiel)
SELECT 
  '5. UTILISATEURS SANS RÔLE' as section;

SELECT 
  p.email,
  p.first_name,
  p.last_name
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.id IS NULL;

-- 6. Vérifier spécifiquement les encadreurs
SELECT 
  '6. ENCADREURS (ROLE = supervisor)' as section;

SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  ur.role,
  ur.assigned_at
FROM profiles p
INNER JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'supervisor'
ORDER BY p.last_name;

-- 7. Vérifier spécifiquement les étudiants
SELECT 
  '7. ÉTUDIANTS (ROLE = student)' as section;

SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.student_id,
  ur.role,
  ur.assigned_at
FROM profiles p
INNER JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'student'
ORDER BY p.last_name;

-- 8. Vérifier les chefs de département
SELECT 
  '8. CHEFS DE DÉPARTEMENT (ROLE = department_head)' as section;

SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  ur.role,
  ur.assigned_at
FROM profiles p
INNER JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'department_head'
ORDER BY p.last_name;

-- 9. Vérifier les départements
SELECT 
  '9. DÉPARTEMENTS' as section;

SELECT 
  code,
  name,
  (SELECT COUNT(*) FROM profiles WHERE department_id = d.id) as nombre_membres
FROM departments d
ORDER BY code;

-- 10. Résumé global
SELECT 
  '10. RÉSUMÉ GLOBAL' as section;

SELECT 
  'Total utilisateurs auth' as metric,
  COUNT(*) as valeur
FROM auth.users
UNION ALL
SELECT 
  'Total profils' as metric,
  COUNT(*) as valeur
FROM profiles
UNION ALL
SELECT 
  'Total rôles attribués' as metric,
  COUNT(*) as valeur
FROM user_roles
UNION ALL
SELECT 
  'Étudiants' as metric,
  COUNT(*) as valeur
FROM user_roles WHERE role = 'student'
UNION ALL
SELECT 
  'Encadreurs' as metric,
  COUNT(*) as valeur
FROM user_roles WHERE role = 'supervisor'
UNION ALL
SELECT 
  'Chefs de département' as metric,
  COUNT(*) as valeur
FROM user_roles WHERE role = 'department_head'
UNION ALL
SELECT 
  'Jury' as metric,
  COUNT(*) as valeur
FROM user_roles WHERE role = 'jury'
UNION ALL
SELECT 
  'Admins' as metric,
  COUNT(*) as valeur
FROM user_roles WHERE role = 'admin';

-- =====================================================
-- DIAGNOSTIC AUTOMATIQUE
-- =====================================================

DO $$
DECLARE
  v_auth_count INTEGER;
  v_profile_count INTEGER;
  v_role_count INTEGER;
  v_supervisor_count INTEGER;
  v_student_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_auth_count FROM auth.users;
  SELECT COUNT(*) INTO v_profile_count FROM profiles;
  SELECT COUNT(*) INTO v_role_count FROM user_roles;
  SELECT COUNT(*) INTO v_supervisor_count FROM user_roles WHERE role = 'supervisor';
  SELECT COUNT(*) INTO v_student_count FROM user_roles WHERE role = 'student';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC AUTOMATIQUE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  IF v_auth_count = 0 THEN
    RAISE NOTICE '❌ PROBLÈME : Aucun utilisateur dans auth.users';
    RAISE NOTICE '   → Créez des utilisateurs via Supabase Dashboard';
  ELSE
    RAISE NOTICE '✓ % utilisateur(s) dans auth.users', v_auth_count;
  END IF;

  IF v_profile_count = 0 THEN
    RAISE NOTICE '❌ PROBLÈME : Aucun profil créé';
    RAISE NOTICE '   → Exécutez le script create-test-users.sql';
  ELSIF v_profile_count < v_auth_count THEN
    RAISE NOTICE '⚠ ATTENTION : % profil(s) mais % utilisateur(s) auth', v_profile_count, v_auth_count;
    RAISE NOTICE '   → Certains utilisateurs n''ont pas de profil';
  ELSE
    RAISE NOTICE '✓ % profil(s) créé(s)', v_profile_count;
  END IF;

  IF v_role_count = 0 THEN
    RAISE NOTICE '❌ PROBLÈME : Aucun rôle attribué';
    RAISE NOTICE '   → Exécutez le script create-test-users.sql';
  ELSE
    RAISE NOTICE '✓ % rôle(s) attribué(s)', v_role_count;
  END IF;

  IF v_supervisor_count = 0 THEN
    RAISE NOTICE '❌ PROBLÈME : Aucun encadreur (role=supervisor)';
    RAISE NOTICE '   → C''est pourquoi la liste est vide !';
    RAISE NOTICE '   → Exécutez le script create-test-users.sql';
  ELSE
    RAISE NOTICE '✓ % encadreur(s) trouvé(s)', v_supervisor_count;
  END IF;

  IF v_student_count = 0 THEN
    RAISE NOTICE '⚠ ATTENTION : Aucun étudiant (role=student)';
  ELSE
    RAISE NOTICE '✓ % étudiant(s) trouvé(s)', v_student_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
  IF v_supervisor_count = 0 OR v_student_count = 0 THEN
    RAISE NOTICE 'SOLUTION :';
    RAISE NOTICE '1. Créez les utilisateurs dans Supabase Auth';
    RAISE NOTICE '2. Exécutez scripts/create-test-users.sql';
    RAISE NOTICE '3. Rechargez la page de l''application';
  ELSE
    RAISE NOTICE 'Tout semble correct !';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
