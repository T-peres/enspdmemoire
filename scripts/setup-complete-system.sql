-- =====================================================
-- CRÉATION DES UTILISATEURS DE TEST - ENSPD
-- =====================================================
-- Ce script crée 8 utilisateurs de test avec leurs profils et rôles
-- Mot de passe pour tous : Test123!
-- =====================================================

-- Note: Les utilisateurs doivent d'abord être créés dans Supabase Auth
-- Ce script crée uniquement les profils et rôles

-- =====================================================
-- FONCTION HELPER POUR CRÉER UN UTILISATEUR COMPLET
-- =====================================================

CREATE OR REPLACE FUNCTION create_test_user(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role app_role,
  p_student_id TEXT DEFAULT NULL,
  p_department_code TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
  v_department_id UUID;
BEGIN
  -- Générer un UUID pour l'utilisateur
  v_user_id := gen_random_uuid();
  
  -- Récupérer l'ID du département si spécifié
  IF p_department_code IS NOT NULL THEN
    SELECT id INTO v_department_id 
    FROM departments 
    WHERE code = p_department_code;
  END IF;
  
  -- Créer le profil
  INSERT INTO profiles (id, email, first_name, last_name, student_id, department_id)
  VALUES (v_user_id, p_email, p_first_name, p_last_name, p_student_id, v_department_id)
  ON CONFLICT (email) DO UPDATE 
  SET first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      student_id = EXCLUDED.student_id,
      department_id = EXCLUDED.department_id
  RETURNING id INTO v_user_id;
  
  -- Créer le rôle
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN 'Utilisateur créé: ' || p_email || ' (ID: ' || v_user_id || ')';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CRÉER LES UTILISATEURS DE TEST
-- =====================================================

-- 1. Admin
SELECT create_test_user(
  'admin@enspd.cm',
  'Admin',
  'ENSPD',
  'admin'::app_role
);

-- 2. Chef de Département
SELECT create_test_user(
  'chef.dept@enspd.cm',
  'Chef',
  'Département',
  'department_head'::app_role,
  NULL,
  'GIT'
);

-- 3. Encadreur 1
SELECT create_test_user(
  'encadreur1@enspd.cm',
  'Jean',
  'Dupont',
  'supervisor'::app_role,
  NULL,
  'GIT'
);

-- 4. Encadreur 2
SELECT create_test_user(
  'encadreur2@enspd.cm',
  'Marie',
  'Martin',
  'supervisor'::app_role,
  NULL,
  'GESI'
);

-- 5. Étudiant 1
SELECT create_test_user(
  'etudiant1@enspd.cm',
  'Pierre',
  'Kamga',
  'student'::app_role,
  'ENS2024001',
  'GIT'
);

-- 6. Étudiant 2
SELECT create_test_user(
  'etudiant2@enspd.cm',
  'Sophie',
  'Nkomo',
  'student'::app_role,
  'ENS2024002',
  'GESI'
);

-- 7. Étudiant 3
SELECT create_test_user(
  'etudiant3@enspd.cm',
  'Paul',
  'Mbarga',
  'student'::app_role,
  'ENS2024003',
  'GC'
);

-- 8. Jury
SELECT create_test_user(
  'jury1@enspd.cm',
  'Dr. François',
  'Essomba',
  'jury'::app_role
);

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Afficher tous les utilisateurs créés
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

-- Compter les utilisateurs par rôle
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
BEGIN
  RAISE NOTICE '✅ 8 utilisateurs de test créés avec succès !';
  RAISE NOTICE 'ℹ️  Mot de passe pour tous : Test123!';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Comptes créés :';
  RAISE NOTICE '   - admin@enspd.cm (Admin)';
  RAISE NOTICE '   - chef.dept@enspd.cm (Chef de Département)';
  RAISE NOTICE '   - encadreur1@enspd.cm (Encadreur - GIT)';
  RAISE NOTICE '   - encadreur2@enspd.cm (Encadreur - GESI)';
  RAISE NOTICE '   - etudiant1@enspd.cm (Étudiant - GIT)';
  RAISE NOTICE '   - etudiant2@enspd.cm (Étudiant - GESI)';
  RAISE NOTICE '   - etudiant3@enspd.cm (Étudiant - GC)';
  RAISE NOTICE '   - jury1@enspd.cm (Jury)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT : Ces utilisateurs doivent aussi être créés dans Supabase Auth';
  RAISE NOTICE '   Allez dans Authentication > Users > Add User pour chaque email';
END $$;

-- =====================================================
-- NETTOYER LA FONCTION HELPER
-- =====================================================

DROP FUNCTION IF EXISTS create_test_user;
