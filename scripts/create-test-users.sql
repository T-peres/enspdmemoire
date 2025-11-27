-- =====================================================
-- SCRIPT DE CRÉATION DES UTILISATEURS DE TEST
-- Application ENSPD - Gestion des Mémoires
-- =====================================================

-- IMPORTANT : Ce script crée uniquement les PROFILS et RÔLES
-- Les utilisateurs doivent d'abord être créés via l'interface Supabase Auth
-- ou via l'inscription normale de l'application

-- =====================================================
-- ÉTAPE 1 : Créer les utilisateurs via Supabase Dashboard
-- =====================================================
-- Allez dans Authentication > Users > Add User
-- Créez ces 5 utilisateurs avec les emails ci-dessous
-- Mot de passe suggéré pour tous : Password123!

-- =====================================================
-- ÉTAPE 2 : Exécuter ce script pour créer les profils
-- =====================================================

-- =====================================================
-- 1. ADMINISTRATEUR
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;
BEGIN
  -- Récupérer l'ID du département GIT
  SELECT id INTO v_dept_id FROM departments WHERE code = 'GIT' LIMIT 1;

  -- Récupérer l'ID de l'utilisateur depuis auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@enspd.cm';

  IF v_user_id IS NOT NULL THEN
    -- Créer le profil
    INSERT INTO profiles (id, email, first_name, last_name, department_id)
    VALUES (v_user_id, 'admin@enspd.cm', 'Admin', 'ENSPD', v_dept_id)
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      department_id = EXCLUDED.department_id;

    -- Attribuer le rôle admin
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE '✓ Administrateur configuré : admin@enspd.cm';
  ELSE
    RAISE NOTICE '⚠ Utilisateur admin@enspd.cm non trouvé. Créez-le d''abord dans Supabase Auth.';
  END IF;
END $$;

-- =====================================================
-- 2. CHEF DE DÉPARTEMENT
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;
BEGIN
  SELECT id INTO v_dept_id FROM departments WHERE code = 'GIT' LIMIT 1;
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'cd.git@enspd.cm';

  IF v_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, first_name, last_name, department_id)
    VALUES (v_user_id, 'cd.git@enspd.cm', 'Jean', 'DUPONT', v_dept_id)
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      department_id = EXCLUDED.department_id;

    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'department_head')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE '✓ Chef de Département configuré : cd.git@enspd.cm';
  ELSE
    RAISE NOTICE '⚠ Utilisateur cd.git@enspd.cm non trouvé. Créez-le d''abord dans Supabase Auth.';
  END IF;
END $$;

-- =====================================================
-- 3. ENCADREUR
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;
BEGIN
  SELECT id INTO v_dept_id FROM departments WHERE code = 'GIT' LIMIT 1;
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'encadreur@enspd.cm';

  IF v_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, first_name, last_name, department_id)
    VALUES (v_user_id, 'encadreur@enspd.cm', 'Marie', 'MARTIN', v_dept_id)
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      department_id = EXCLUDED.department_id;

    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'supervisor')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE '✓ Encadreur configuré : encadreur@enspd.cm';
  ELSE
    RAISE NOTICE '⚠ Utilisateur encadreur@enspd.cm non trouvé. Créez-le d''abord dans Supabase Auth.';
  END IF;
END $$;

-- =====================================================
-- 4. ÉTUDIANT
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;
BEGIN
  SELECT id INTO v_dept_id FROM departments WHERE code = 'GIT' LIMIT 1;
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'etudiant@enspd.cm';

  IF v_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, first_name, last_name, student_id, department_id)
    VALUES (v_user_id, 'etudiant@enspd.cm', 'Pierre', 'KAMGA', '21GIT001', v_dept_id)
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      student_id = EXCLUDED.student_id,
      department_id = EXCLUDED.department_id;

    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE '✓ Étudiant configuré : etudiant@enspd.cm (Matricule: 21GIT001)';
  ELSE
    RAISE NOTICE '⚠ Utilisateur etudiant@enspd.cm non trouvé. Créez-le d''abord dans Supabase Auth.';
  END IF;
END $$;

-- =====================================================
-- 5. MEMBRE DU JURY
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_dept_id UUID;
BEGIN
  SELECT id INTO v_dept_id FROM departments WHERE code = 'GIT' LIMIT 1;
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'jury@enspd.cm';

  IF v_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, first_name, last_name, department_id)
    VALUES (v_user_id, 'jury@enspd.cm', 'Paul', 'NGUEMA', v_dept_id)
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      department_id = EXCLUDED.department_id;

    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'jury')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE '✓ Membre du Jury configuré : jury@enspd.cm';
  ELSE
    RAISE NOTICE '⚠ Utilisateur jury@enspd.cm non trouvé. Créez-le d''abord dans Supabase Auth.';
  END IF;
END $$;

-- =====================================================
-- RÉSUMÉ
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONFIGURATION DES PROFILS TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Emails des utilisateurs à créer :';
  RAISE NOTICE '1. admin@enspd.cm (Admin)';
  RAISE NOTICE '2. cd.git@enspd.cm (Chef de Département)';
  RAISE NOTICE '3. encadreur@enspd.cm (Encadreur)';
  RAISE NOTICE '4. etudiant@enspd.cm (Étudiant)';
  RAISE NOTICE '5. jury@enspd.cm (Jury)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Afficher tous les utilisateurs créés
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  p.student_id,
  d.code as department,
  array_agg(ur.role) as roles
FROM profiles p
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE p.email IN (
  'admin@enspd.cm',
  'cd.git@enspd.cm',
  'encadreur@enspd.cm',
  'etudiant@enspd.cm',
  'jury@enspd.cm'
)
GROUP BY p.id, p.email, p.first_name, p.last_name, p.student_id, d.code
ORDER BY p.email;
