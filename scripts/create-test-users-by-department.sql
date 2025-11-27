-- =====================================================
-- CRÉATION D'UTILISATEURS DE TEST PAR DÉPARTEMENT
-- =====================================================
-- Ce script crée 2 étudiants et 2 encadreurs par département
-- pour tester le filtrage et les fonctionnalités

DO $$
DECLARE
  v_dept RECORD;
  v_student1_id UUID;
  v_student2_id UUID;
  v_supervisor1_id UUID;
  v_supervisor2_id UUID;
BEGIN
  -- Boucle sur chaque département
  FOR v_dept IN SELECT * FROM departments ORDER BY code LOOP
    RAISE NOTICE 'Création des utilisateurs pour le département: %', v_dept.code;
    
    -- =====================================================
    -- ÉTUDIANT 1
    -- =====================================================
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'etudiant1.' || LOWER(v_dept.code) || '@enspd.cm') THEN
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
        'etudiant1.' || LOWER(v_dept.code) || '@enspd.cm',
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
      
      -- Créer le profil
      INSERT INTO profiles (id, email, first_name, last_name, department_id, student_id)
      VALUES (
        v_student1_id,
        'etudiant1.' || LOWER(v_dept.code) || '@enspd.cm',
        'Étudiant1',
        v_dept.code,
        v_dept.id,
        v_dept.code || '001'
      );
      
      -- Attribuer le rôle
      INSERT INTO user_roles (user_id, role)
      VALUES (v_student1_id, 'student');
      
      RAISE NOTICE '  ✓ Étudiant 1 créé: etudiant1.%@enspd.cm', LOWER(v_dept.code);
    END IF;
    
    -- =====================================================
    -- ÉTUDIANT 2
    -- =====================================================
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'etudiant2.' || LOWER(v_dept.code) || '@enspd.cm') THEN
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
        'etudiant2.' || LOWER(v_dept.code) || '@enspd.cm',
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
      
      -- Créer le profil
      INSERT INTO profiles (id, email, first_name, last_name, department_id, student_id)
      VALUES (
        v_student2_id,
        'etudiant2.' || LOWER(v_dept.code) || '@enspd.cm',
        'Étudiant2',
        v_dept.code,
        v_dept.id,
        v_dept.code || '002'
      );
      
      -- Attribuer le rôle
      INSERT INTO user_roles (user_id, role)
      VALUES (v_student2_id, 'student');
      
      RAISE NOTICE '  ✓ Étudiant 2 créé: etudiant2.%@enspd.cm', LOWER(v_dept.code);
    END IF;
    
    -- =====================================================
    -- ENCADREUR 1
    -- =====================================================
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'encadreur1.' || LOWER(v_dept.code) || '@enspd.cm') THEN
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
        'encadreur1.' || LOWER(v_dept.code) || '@enspd.cm',
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
      
      -- Créer le profil
      INSERT INTO profiles (id, email, first_name, last_name, department_id)
      VALUES (
        v_supervisor1_id,
        'encadreur1.' || LOWER(v_dept.code) || '@enspd.cm',
        'Encadreur1',
        v_dept.code,
        v_dept.id
      );
      
      -- Attribuer le rôle
      INSERT INTO user_roles (user_id, role)
      VALUES (v_supervisor1_id, 'supervisor');
      
      RAISE NOTICE '  ✓ Encadreur 1 créé: encadreur1.%@enspd.cm', LOWER(v_dept.code);
    END IF;
    
    -- =====================================================
    -- ENCADREUR 2
    -- =====================================================
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'encadreur2.' || LOWER(v_dept.code) || '@enspd.cm') THEN
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
        'encadreur2.' || LOWER(v_dept.code) || '@enspd.cm',
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
      
      -- Créer le profil
      INSERT INTO profiles (id, email, first_name, last_name, department_id)
      VALUES (
        v_supervisor2_id,
        'encadreur2.' || LOWER(v_dept.code) || '@enspd.cm',
        'Encadreur2',
        v_dept.code,
        v_dept.id
      );
      
      -- Attribuer le rôle
      INSERT INTO user_roles (user_id, role)
      VALUES (v_supervisor2_id, 'supervisor');
      
      RAISE NOTICE '  ✓ Encadreur 2 créé: encadreur2.%@enspd.cm', LOWER(v_dept.code);
    END IF;
    
  END LOOP;
  
  RAISE NOTICE '=== Création terminée ===';
END $$;

-- Vérification
SELECT 
  '=== RÉSUMÉ PAR DÉPARTEMENT ===' as section;

SELECT 
  d.code as dept,
  COUNT(DISTINCT CASE WHEN ur.role = 'student' THEN p.id END) as etudiants,
  COUNT(DISTINCT CASE WHEN ur.role = 'supervisor' THEN p.id END) as encadreurs,
  COUNT(DISTINCT CASE WHEN ur.role = 'department_head' THEN p.id END) as chefs
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY d.code
ORDER BY d.code;

-- Liste complète des utilisateurs de test
SELECT 
  '' as spacer,
  '=== LISTE DES UTILISATEURS DE TEST ===' as section;

SELECT 
  d.code as dept,
  p.email,
  ur.role,
  p.first_name || ' ' || p.last_name as nom_complet
FROM profiles p
JOIN departments d ON d.id = p.department_id
JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email LIKE '%.' || LOWER(d.code) || '@enspd.cm'
ORDER BY d.code, ur.role, p.email;

-- =====================================================
-- INFORMATIONS DE CONNEXION
-- =====================================================
-- Format des emails:
-- - Étudiants: etudiant1.[dept]@enspd.cm, etudiant2.[dept]@enspd.cm
-- - Encadreurs: encadreur1.[dept]@enspd.cm, encadreur2.[dept]@enspd.cm
-- - Chefs: chef.[dept]@enspd.cm
--
-- Mots de passe:
-- - Étudiants: Etudiant2024!
-- - Encadreurs: Encadreur2024!
-- - Chefs: Chef[DEPT]2024!
--
-- Exemples pour GIT:
-- - etudiant1.git@enspd.cm / Etudiant2024!
-- - encadreur1.git@enspd.cm / Encadreur2024!
-- - chef.git@enspd.cm / ChefGIT2024!
-- =====================================================
