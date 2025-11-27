-- =====================================================
-- CRÉATION RAPIDE D'UTILISATEURS DE TEST
-- =====================================================
-- Ce script crée rapidement quelques utilisateurs pour tester

DO $$
DECLARE
  v_student1_id UUID;
  v_student2_id UUID;
  v_supervisor1_id UUID;
  v_supervisor2_id UUID;
  v_git_dept_id UUID;
BEGIN
  -- Récupérer l'ID du département GIT
  SELECT id INTO v_git_dept_id FROM departments WHERE code = 'GIT';
  
  RAISE NOTICE '=== CRÉATION DES UTILISATEURS DE TEST ===';
  
  -- =====================================================
  -- ÉTUDIANT 1
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'etudiant1@enspd.cm') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'etudiant1@enspd.cm',
      crypt('Etudiant2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_student1_id;
    
    INSERT INTO profiles (id, email, first_name, last_name, department_id, student_id)
    VALUES (
      v_student1_id,
      'etudiant1@enspd.cm',
      'Jean',
      'Dupont',
      v_git_dept_id,
      'GIT001'
    );
    
    INSERT INTO user_roles (user_id, role)
    VALUES (v_student1_id, 'student');
    
    RAISE NOTICE '✓ Étudiant 1 créé: etudiant1@enspd.cm / Etudiant2024!';
  ELSE
    RAISE NOTICE '⚠ Étudiant 1 existe déjà';
  END IF;
  
  -- =====================================================
  -- ÉTUDIANT 2
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'etudiant2@enspd.cm') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'etudiant2@enspd.cm',
      crypt('Etudiant2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_student2_id;
    
    INSERT INTO profiles (id, email, first_name, last_name, department_id, student_id)
    VALUES (
      v_student2_id,
      'etudiant2@enspd.cm',
      'Marie',
      'Martin',
      v_git_dept_id,
      'GIT002'
    );
    
    INSERT INTO user_roles (user_id, role)
    VALUES (v_student2_id, 'student');
    
    RAISE NOTICE '✓ Étudiant 2 créé: etudiant2@enspd.cm / Etudiant2024!';
  ELSE
    RAISE NOTICE '⚠ Étudiant 2 existe déjà';
  END IF;
  
  -- =====================================================
  -- ENCADREUR 1
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'encadreur1@enspd.cm') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'encadreur1@enspd.cm',
      crypt('Encadreur2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_supervisor1_id;
    
    INSERT INTO profiles (id, email, first_name, last_name, department_id)
    VALUES (
      v_supervisor1_id,
      'encadreur1@enspd.cm',
      'Dr. Pierre',
      'Bernard',
      v_git_dept_id
    );
    
    INSERT INTO user_roles (user_id, role)
    VALUES (v_supervisor1_id, 'supervisor');
    
    RAISE NOTICE '✓ Encadreur 1 créé: encadreur1@enspd.cm / Encadreur2024!';
  ELSE
    RAISE NOTICE '⚠ Encadreur 1 existe déjà';
  END IF;
  
  -- =====================================================
  -- ENCADREUR 2
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'encadreur2@enspd.cm') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'encadreur2@enspd.cm',
      crypt('Encadreur2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_supervisor2_id;
    
    INSERT INTO profiles (id, email, first_name, last_name, department_id)
    VALUES (
      v_supervisor2_id,
      'encadreur2@enspd.cm',
      'Dr. Sophie',
      'Dubois',
      v_git_dept_id
    );
    
    INSERT INTO user_roles (user_id, role)
    VALUES (v_supervisor2_id, 'supervisor');
    
    RAISE NOTICE '✓ Encadreur 2 créé: encadreur2@enspd.cm / Encadreur2024!';
  ELSE
    RAISE NOTICE '⚠ Encadreur 2 existe déjà';
  END IF;
  
  RAISE NOTICE '=== CRÉATION TERMINÉE ===';
END $$;

-- Vérification
SELECT 
  '=== VÉRIFICATION DES UTILISATEURS CRÉÉS ===' as section;

SELECT 
  p.email,
  p.first_name || ' ' || p.last_name as nom,
  d.code as departement,
  ur.role,
  p.student_id
FROM profiles p
JOIN departments d ON d.id = p.department_id
JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email IN (
  'etudiant1@enspd.cm',
  'etudiant2@enspd.cm',
  'encadreur1@enspd.cm',
  'encadreur2@enspd.cm'
)
ORDER BY ur.role, p.email;

-- Résumé
SELECT 
  '' as spacer,
  '=== RÉSUMÉ ===' as section;

SELECT 
  'Étudiants créés' as type,
  COUNT(*) as nombre
FROM user_roles
WHERE role = 'student'

UNION ALL

SELECT 
  'Encadreurs créés' as type,
  COUNT(*) as nombre
FROM user_roles
WHERE role = 'supervisor'

UNION ALL

SELECT 
  'Chefs de département créés' as type,
  COUNT(*) as nombre
FROM user_roles
WHERE role = 'department_head';

-- =====================================================
-- INFORMATIONS DE CONNEXION
-- =====================================================
-- 
-- ÉTUDIANTS:
-- - etudiant1@enspd.cm / Etudiant2024!
-- - etudiant2@enspd.cm / Etudiant2024!
--
-- ENCADREURS:
-- - encadreur1@enspd.cm / Encadreur2024!
-- - encadreur2@enspd.cm / Encadreur2024!
--
-- CHEF DE DÉPARTEMENT GIT:
-- - chef.git@enspd.cm / ChefGIT2024!
--
-- Tous sont dans le département GIT
-- =====================================================
