-- =====================================================
-- SCRIPT: Corriger les rôles des encadreurs
-- Date: 2025-11-27
-- Description: Ajouter le rôle "supervisor" aux encadreurs
-- =====================================================

-- 1. Diagnostic: Vérifier les utilisateurs existants
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.department_id,
  d.code as department_code,
  ARRAY_AGG(ur.role) as roles
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.email, p.first_name, p.last_name, p.department_id, d.code
ORDER BY p.last_name;

-- 2. Vérifier combien d'encadreurs existent
SELECT 
  COUNT(*) as total_supervisors,
  COUNT(DISTINCT ur.user_id) as supervisors_with_role
FROM user_roles ur
WHERE ur.role = 'supervisor';

-- 3. Identifier les utilisateurs qui devraient être encadreurs
-- (Ceux qui ne sont ni étudiants ni chefs de département)
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.department_id,
  d.code as department_code,
  ARRAY_AGG(ur.role) as current_roles
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.id NOT IN (
  SELECT user_id FROM user_roles WHERE role IN ('student', 'department_head', 'admin')
)
GROUP BY p.id, p.email, p.first_name, p.last_name, p.department_id, d.code
ORDER BY p.last_name;

-- 4. CORRECTION: Ajouter le rôle "supervisor" aux encadreurs
-- Option A: Si vous avez des utilisateurs spécifiques à marquer comme encadreurs
-- Remplacez les emails par ceux de vos encadreurs réels

-- Exemple: Ajouter le rôle supervisor à des utilisateurs spécifiques
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'supervisor'::app_role
-- FROM profiles
-- WHERE email IN (
--   'encadreur1@enspd.cm',
--   'encadreur2@enspd.cm',
--   'encadreur3@enspd.cm'
-- )
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Option B: Marquer automatiquement tous les utilisateurs qui ne sont pas étudiants/chefs comme encadreurs
-- ATTENTION: Vérifiez bien avant d'exécuter cette requête!
INSERT INTO user_roles (user_id, role)
SELECT DISTINCT p.id, 'supervisor'::app_role
FROM profiles p
WHERE p.id NOT IN (
  SELECT user_id FROM user_roles WHERE role IN ('student', 'department_head', 'admin')
)
AND p.email NOT LIKE '%admin%'  -- Exclure les admins
AND p.email IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Vérification après correction
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.department_id,
  d.code as department_code,
  ARRAY_AGG(ur.role) as roles
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE EXISTS (
  SELECT 1 FROM user_roles ur2 
  WHERE ur2.user_id = p.id AND ur2.role = 'supervisor'
)
GROUP BY p.id, p.email, p.first_name, p.last_name, p.department_id, d.code
ORDER BY d.code, p.last_name;

-- 6. Statistiques finales
SELECT 
  role,
  COUNT(*) as count
FROM user_roles
GROUP BY role
ORDER BY role;

-- 7. ALTERNATIVE: Créer des encadreurs de test si nécessaire
-- Décommentez et adaptez selon vos besoins

/*
-- Créer des encadreurs de test pour chaque département
DO $$
DECLARE
  dept RECORD;
  new_user_id UUID;
  new_email TEXT;
BEGIN
  FOR dept IN SELECT id, code, name FROM departments ORDER BY code LOOP
    -- Créer 2 encadreurs par département
    FOR i IN 1..2 LOOP
      new_email := 'encadreur' || i || '.' || LOWER(dept.code) || '@enspd.cm';
      
      -- Vérifier si l'utilisateur existe déjà
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = new_email) THEN
        -- Créer le profil
        INSERT INTO profiles (id, email, first_name, last_name, department_id)
        VALUES (
          gen_random_uuid(),
          new_email,
          'Encadreur' || i,
          dept.code,
          dept.id
        )
        RETURNING id INTO new_user_id;
        
        -- Ajouter le rôle supervisor
        INSERT INTO user_roles (user_id, role)
        VALUES (new_user_id, 'supervisor'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Créé: % % (%) - Département: %', 
          'Encadreur' || i, dept.code, new_email, dept.name;
      END IF;
    END LOOP;
  END LOOP;
END $$;
*/

-- 8. Afficher le résumé final par département
SELECT 
  d.code as department,
  d.name as department_name,
  COUNT(DISTINCT CASE WHEN ur.role = 'student' THEN p.id END) as students,
  COUNT(DISTINCT CASE WHEN ur.role = 'supervisor' THEN p.id END) as supervisors,
  COUNT(DISTINCT CASE WHEN ur.role = 'department_head' THEN p.id END) as dept_heads
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY d.id, d.code, d.name
ORDER BY d.code;

-- =====================================================
-- INSTRUCTIONS D'UTILISATION
-- =====================================================

-- 1. Exécutez d'abord les requêtes de diagnostic (1-3)
-- 2. Identifiez les utilisateurs qui doivent être encadreurs
-- 3. Choisissez Option A (spécifique) ou Option B (automatique)
-- 4. Exécutez la correction choisie
-- 5. Vérifiez avec les requêtes 5-8

-- NOTES:
-- - Option A: Plus sûre, vous contrôlez exactement qui devient encadreur
-- - Option B: Plus rapide, mais vérifiez bien les résultats
-- - Option Alternative: Crée des encadreurs de test pour chaque département
