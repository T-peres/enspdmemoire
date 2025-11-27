-- =====================================================
-- CRÉATION DES CHEFS DE DÉPARTEMENT
-- =====================================================
-- Ce script crée un chef de département pour chaque département de l'ENSPD

-- IMPORTANT: Ce script utilise l'API auth de Supabase
-- Pour créer les utilisateurs, vous devez utiliser l'interface Supabase
-- ou l'API REST. Ce script crée uniquement les profils et rôles.

-- Alternative: Créer les utilisateurs via DO block
DO $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;
BEGIN
  -- =====================================================
  -- Chef de département GIT
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'chef.git@enspd.cm') THEN
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
      'chef.git@enspd.cm',
      crypt('ChefGIT2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- =====================================================
  -- Chef de département GESI
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'chef.gesi@enspd.cm') THEN
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
      'chef.gesi@enspd.cm',
      crypt('ChefGESI2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- =====================================================
  -- Chef de département GQHSE
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'chef.gqhse@enspd.cm') THEN
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
      'chef.gqhse@enspd.cm',
      crypt('ChefGQHSE2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- =====================================================
  -- Chef de département GAM
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'chef.gam@enspd.cm') THEN
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
      'chef.gam@enspd.cm',
      crypt('ChefGAM2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- =====================================================
  -- Chef de département GMP
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'chef.gmp@enspd.cm') THEN
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
      'chef.gmp@enspd.cm',
      crypt('ChefGMP2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- =====================================================
  -- Chef de département GP
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'chef.gp@enspd.cm') THEN
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
      'chef.gp@enspd.cm',
      crypt('ChefGP2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- =====================================================
  -- Chef de département GE
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'chef.ge@enspd.cm') THEN
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
      'chef.ge@enspd.cm',
      crypt('ChefGE2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- =====================================================
  -- Chef de département GM
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'chef.gm@enspd.cm') THEN
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
      'chef.gm@enspd.cm',
      crypt('ChefGM2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- =====================================================
  -- Chef de département GPH
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'chef.gph@enspd.cm') THEN
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
      'chef.gph@enspd.cm',
      crypt('ChefGPH2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- =====================================================
  -- Chef de département GC
  -- =====================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'chef.gc@enspd.cm') THEN
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
      'chef.gc@enspd.cm',
      crypt('ChefGC2024!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;

END $$;

-- =====================================================
-- 2. Créer les profils pour les chefs de département
-- =====================================================

-- Chef GIT
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  au.id,
  'chef.git@enspd.cm',
  'Chef',
  'GIT',
  d.id
FROM auth.users au
CROSS JOIN departments d
WHERE au.email = 'chef.git@enspd.cm'
  AND d.code = 'GIT'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'chef.git@enspd.cm');

-- Chef GESI
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  au.id,
  'chef.gesi@enspd.cm',
  'Chef',
  'GESI',
  d.id
FROM auth.users au
CROSS JOIN departments d
WHERE au.email = 'chef.gesi@enspd.cm'
  AND d.code = 'GESI'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'chef.gesi@enspd.cm');

-- Chef GQHSE
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  au.id,
  'chef.gqhse@enspd.cm',
  'Chef',
  'GQHSE',
  d.id
FROM auth.users au
CROSS JOIN departments d
WHERE au.email = 'chef.gqhse@enspd.cm'
  AND d.code = 'GQHSE'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'chef.gqhse@enspd.cm');

-- Chef GAM
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  au.id,
  'chef.gam@enspd.cm',
  'Chef',
  'GAM',
  d.id
FROM auth.users au
CROSS JOIN departments d
WHERE au.email = 'chef.gam@enspd.cm'
  AND d.code = 'GAM'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'chef.gam@enspd.cm');

-- Chef GMP
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  au.id,
  'chef.gmp@enspd.cm',
  'Chef',
  'GMP',
  d.id
FROM auth.users au
CROSS JOIN departments d
WHERE au.email = 'chef.gmp@enspd.cm'
  AND d.code = 'GMP'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'chef.gmp@enspd.cm');

-- Chef GP
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  au.id,
  'chef.gp@enspd.cm',
  'Chef',
  'GP',
  d.id
FROM auth.users au
CROSS JOIN departments d
WHERE au.email = 'chef.gp@enspd.cm'
  AND d.code = 'GP'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'chef.gp@enspd.cm');

-- Chef GE
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  au.id,
  'chef.ge@enspd.cm',
  'Chef',
  'GE',
  d.id
FROM auth.users au
CROSS JOIN departments d
WHERE au.email = 'chef.ge@enspd.cm'
  AND d.code = 'GE'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'chef.ge@enspd.cm');

-- Chef GM
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  au.id,
  'chef.gm@enspd.cm',
  'Chef',
  'GM',
  d.id
FROM auth.users au
CROSS JOIN departments d
WHERE au.email = 'chef.gm@enspd.cm'
  AND d.code = 'GM'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'chef.gm@enspd.cm');

-- Chef GPH
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  au.id,
  'chef.gph@enspd.cm',
  'Chef',
  'GPH',
  d.id
FROM auth.users au
CROSS JOIN departments d
WHERE au.email = 'chef.gph@enspd.cm'
  AND d.code = 'GPH'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'chef.gph@enspd.cm');

-- Chef GC
INSERT INTO profiles (id, email, first_name, last_name, department_id)
SELECT 
  au.id,
  'chef.gc@enspd.cm',
  'Chef',
  'GC',
  d.id
FROM auth.users au
CROSS JOIN departments d
WHERE au.email = 'chef.gc@enspd.cm'
  AND d.code = 'GC'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'chef.gc@enspd.cm');

-- =====================================================
-- 3. Attribuer le rôle 'department_head' à chaque chef
-- =====================================================

INSERT INTO user_roles (user_id, role)
SELECT p.id, 'department_head'::app_role
FROM profiles p
WHERE p.email IN (
  'chef.git@enspd.cm',
  'chef.gesi@enspd.cm',
  'chef.gqhse@enspd.cm',
  'chef.gam@enspd.cm',
  'chef.gmp@enspd.cm',
  'chef.gp@enspd.cm',
  'chef.ge@enspd.cm',
  'chef.gm@enspd.cm',
  'chef.gph@enspd.cm',
  'chef.gc@enspd.cm'
)
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'department_head'
);

-- =====================================================
-- 4. Vérification
-- =====================================================

SELECT 
  d.code as dept_code,
  d.name as dept_name,
  p.email as chef_email,
  p.first_name,
  p.last_name,
  ur.role
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
LEFT JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'department_head'
WHERE p.email LIKE 'chef.%@enspd.cm'
ORDER BY d.code;

-- =====================================================
-- INFORMATIONS DE CONNEXION
-- =====================================================
-- Email: chef.[code_dept]@enspd.cm
-- Mot de passe: Chef[CODE_DEPT]2024!
-- 
-- Exemples:
-- - chef.git@enspd.cm / ChefGIT2024!
-- - chef.gesi@enspd.cm / ChefGESI2024!
-- - chef.gc@enspd.cm / ChefGC2024!
-- 
-- IMPORTANT: Demander aux chefs de changer leur mot de passe
-- lors de la première connexion.
-- =====================================================
