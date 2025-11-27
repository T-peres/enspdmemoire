-- =====================================================
-- MISE À JOUR DES DÉPARTEMENTS POUR LES UTILISATEURS EXISTANTS
-- =====================================================
-- 
-- ⚠️ IMPORTANT : Ce script doit être exécuté APRÈS la migration principale
-- (20240101000000_complete_thesis_management_schema.sql)
-- 
-- Si vous obtenez l'erreur "relation departments n'existe pas",
-- exécutez d'abord la migration principale !
-- =====================================================

-- Vérifier que la table departments existe et contient les données
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'departments') THEN
    RAISE EXCEPTION 'La table departments n''existe pas ! Exécutez d''abord la migration principale : 20240101000000_complete_thesis_management_schema.sql';
  END IF;
END $$;

-- Afficher les départements disponibles
SELECT code, name FROM departments ORDER BY code;

-- Mettre à jour les étudiants avec des départements aléatoires (pour test)
-- En production, cela devrait être fait manuellement ou via import

-- Étudiant 1 -> GIT
UPDATE profiles 
SET department_id = (SELECT id FROM departments WHERE code = 'GIT')
WHERE email = 'etudiant1@enspd.cm';

-- Étudiant 2 -> GESI
UPDATE profiles 
SET department_id = (SELECT id FROM departments WHERE code = 'GESI')
WHERE email = 'etudiant2@enspd.cm';

-- Étudiant 3 -> GC
UPDATE profiles 
SET department_id = (SELECT id FROM departments WHERE code = 'GC')
WHERE email = 'etudiant3@enspd.cm';

-- Encadreur 1 -> GIT
UPDATE profiles 
SET department_id = (SELECT id FROM departments WHERE code = 'GIT')
WHERE email = 'encadreur1@enspd.cm';

-- Encadreur 2 -> GESI
UPDATE profiles 
SET department_id = (SELECT id FROM departments WHERE code = 'GESI')
WHERE email = 'encadreur2@enspd.cm';

-- Chef de département -> GIT (peut gérer tous les départements)
UPDATE profiles 
SET department_id = (SELECT id FROM departments WHERE code = 'GIT')
WHERE email = 'chef.dept@enspd.cm';

-- Vérifier les mises à jour
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  d.code as dept_code,
  d.name as dept_name
FROM profiles p
LEFT JOIN departments d ON p.department_id = d.id
WHERE p.email LIKE '%@enspd.cm'
ORDER BY p.email;
