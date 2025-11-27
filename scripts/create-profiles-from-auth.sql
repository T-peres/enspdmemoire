-- =====================================================
-- CRÉER LES PROFILS À PARTIR DES UTILISATEURS AUTH
-- =====================================================
-- ⚠️ PRÉREQUIS : Les utilisateurs doivent d'abord être créés dans Supabase Auth
-- Voir CREER_UTILISATEURS_AUTH.md pour les instructions
-- =====================================================

-- Vérifier que les utilisateurs existent dans auth.users
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM auth.users
  WHERE email LIKE '%@enspd.cm';
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé dans auth.users ! Créez d''abord les utilisateurs dans Authentication > Users';
  ELSE
    RAISE NOTICE '✅ % utilisateur(s) trouvé(s) dans auth.users', v_count;
  END IF;
END $$;

-- =====================================================
-- CRÉER LES PROFILS
-- =====================================================

-- 1. Admin
INSERT INTO profiles (id, email, first_name, last_name)
SELECT 
  id,
  email,
  'Admin',
  'ENSPD'
FROM auth.users
WHERE email = 'admin@enspd.cm'
ON CONFLICT (id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- 2. Chef de Département
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  u.id,
  u.email,
  'Chef',
  'Département',
  d.id
FROM auth.users u
CROSS JOIN departments d
WHERE u.email = 'chef.dept@enspd.cm'
  AND d.code = 'GIT'
ON CONFLICT (id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    department_id = EXCLUDED.department_id;

-- 3. Encadreur 1
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  u.id,
  u.email,
  'Jean',
  'Dupont',
  d.id
FROM auth.users u
CROSS JOIN departments d
WHERE u.email = 'encadreur1@enspd.cm'
  AND d.code = 'GIT'
ON CONFLICT (id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    department_id = EXCLUDED.department_id;

-- 4. Encadreur 2
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  u.id,
  u.email,
  'Marie',
  'Martin',
  d.id
FROM auth.users u
CROSS JOIN departments d
WHERE u.email = 'encadreur2@enspd.cm'
  AND d.code = 'GESI'
ON CONFLICT (id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    department_id = EXCLUDED.department_id;

-- 5. Étudiant 1
INSERT INTO profiles (id, email, first_name, last_name, student_id, department_id)
SELECT 
  u.id,
  u.email,
  'Pierre',
  'Kamga',
  'ENS2024001',
  d.id
FROM auth.users u
CROSS JOIN departments d
WHERE u.email = 'etudiant1@enspd.cm'
  AND d.code = 'GIT'
ON CONFLICT (id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    student_id = EXCLUDED.student_id,
    department_id = EXCLUDED.department_id;

-- 6. Étudiant 2
INSERT INTO profiles (id, email, first_name, last_name, student_id, department_id)
SELECT 
  u.id,
  u.email,
  'Sophie',
  'Nkomo',
  'ENS2024002',
  d.id
FROM auth.users u
CROSS JOIN departments d
WHERE u.email = 'etudiant2@enspd.cm'
  AND d.code = 'GESI'
ON CONFLICT (id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    student_id = EXCLUDED.student_id,
    department_id = EXCLUDED.department_id;

-- 7. Étudiant 3
INSERT INTO profiles (id, email, first_name, last_name, student_id, department_id)
SELECT 
  u.id,
  u.email,
  'Paul',
  'Mbarga',
  'ENS2024003',
  d.id
FROM auth.users u
CROSS JOIN departments d
WHERE u.email = 'etudiant3@enspd.cm'
  AND d.code = 'GC'
ON CONFLICT (id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    student_id = EXCLUDED.student_id,
    department_id = EXCLUDED.department_id;

-- 8. Jury
INSERT INTO profiles (id, email, first_name, last_name)
SELECT 
  id,
  email,
  'Dr. François',
  'Essomba'
FROM auth.users
WHERE email = 'jury1@enspd.cm'
ON CONFLICT (id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- =====================================================
-- CRÉER LES RÔLES
-- =====================================================

-- Admin
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@enspd.cm'
ON CONFLICT (user_id, role) DO NOTHING;

-- Chef de Département
INSERT INTO user_roles (user_id, role)
SELECT id, 'department_head'::app_role
FROM auth.users
WHERE email = 'chef.dept@enspd.cm'
ON CONFLICT (user_id, role) DO NOTHING;

-- Encadreurs
INSERT INTO user_roles (user_id, role)
SELECT id, 'supervisor'::app_role
FROM auth.users
WHERE email IN ('encadreur1@enspd.cm', 'encadreur2@enspd.cm')
ON CONFLICT (user_id, role) DO NOTHING;

-- Étudiants
INSERT INTO user_roles (user_id, role)
SELECT id, 'student'::app_role
FROM auth.users
WHERE email IN ('etudiant1@enspd.cm', 'etudiant2@enspd.cm', 'etudiant3@enspd.cm')
ON CONFLICT (user_id, role) DO NOTHING;

-- Jury
INSERT INTO user_roles (user_id, role)
SELECT id, 'jury'::app_role
FROM auth.users
WHERE email = 'jury1@enspd.cm'
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Afficher les profils créés
SELECT 
  p.email as "Email",
  p.first_name || ' ' || p.last_name as "Nom Complet",
  p.student_id as "Matricule",
  d.code as "Département",
  ur.role as "Rôle"
FROM profiles p
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email LIKE '%@enspd.cm'
ORDER BY p.email;

-- Compter les profils par rôle
SELECT 
  role as "Rôle",
  COUNT(*) as "Nombre"
FROM user_roles ur
JOIN profiles p ON ur.user_id = p.id
WHERE p.email LIKE '%@enspd.cm'
GROUP BY role
ORDER BY role;

-- Message de succès
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM profiles
  WHERE email LIKE '%@enspd.cm';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ % profil(s) créé(s) avec succès !', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '📧 Comptes disponibles :';
  RAISE NOTICE '   - admin@enspd.cm (Admin)';
  RAISE NOTICE '   - chef.dept@enspd.cm (Chef de Département)';
  RAISE NOTICE '   - encadreur1@enspd.cm (Encadreur - GIT)';
  RAISE NOTICE '   - encadreur2@enspd.cm (Encadreur - GESI)';
  RAISE NOTICE '   - etudiant1@enspd.cm (Étudiant - GIT)';
  RAISE NOTICE '   - etudiant2@enspd.cm (Étudiant - GESI)';
  RAISE NOTICE '   - etudiant3@enspd.cm (Étudiant - GC)';
  RAISE NOTICE '   - jury1@enspd.cm (Jury)';
  RAISE NOTICE '';
  RAISE NOTICE '🔑 Mot de passe pour tous : Test123!';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Vous pouvez maintenant lancer l''application : npm run dev';
END $$;
