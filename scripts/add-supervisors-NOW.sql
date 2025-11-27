-- =====================================================
-- CORRECTION IMMÉDIATE: Ajouter des encadreurs
-- Date: 2025-11-27
-- IMPORTANT: Utiliser ::app_role pour le cast
-- =====================================================

-- ÉTAPE 1: Voir tous les utilisateurs disponibles
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  d.code as department,
  STRING_AGG(ur.role::text, ', ') as current_roles
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.email, p.first_name, p.last_name, d.code
ORDER BY d.code, p.last_name;

-- ÉTAPE 2: CORRECTION - Choisissez UNE des méthodes ci-dessous

-- ========================================
-- MÉTHODE 1: Par email (RECOMMANDÉ)
-- ========================================
-- Remplacez les emails par ceux de vos encadreurs réels
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'supervisor'::app_role
FROM profiles p
WHERE p.email IN (
  'encadreur1@enspd.cm',
  'encadreur2@enspd.cm',
  'prof.dupont@enspd.cm'
  -- Ajoutez d'autres emails ici
)
ON CONFLICT (user_id, role) DO NOTHING;

-- ========================================
-- MÉTHODE 2: Tous les non-étudiants (AUTOMATIQUE)
-- ========================================
-- ATTENTION: Vérifiez bien la liste avant!
-- INSERT INTO user_roles (user_id, role)
-- SELECT p.id, 'supervisor'::app_role
-- FROM profiles p
-- WHERE p.id NOT IN (
--   SELECT user_id FROM user_roles 
--   WHERE role IN ('student', 'admin', 'department_head')
-- )
-- AND p.email NOT LIKE '%admin%'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- ========================================
-- MÉTHODE 3: Créer des encadreurs de test
-- ========================================
-- Crée 1 encadreur par département
-- DO $$
-- DECLARE
--   dept RECORD;
--   new_user_id UUID;
--   new_email TEXT;
-- BEGIN
--   FOR dept IN SELECT id, code, name FROM departments ORDER BY code LOOP
--     new_email := 'encadreur.' || LOWER(dept.code) || '@enspd.cm';
--     
--     IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = new_email) THEN
--       INSERT INTO profiles (id, email, first_name, last_name, department_id)
--       VALUES (
--         gen_random_uuid(),
--         new_email,
--         'Encadreur',
--         dept.code,
--         dept.id
--       )
--       RETURNING id INTO new_user_id;
--       
--       INSERT INTO user_roles (user_id, role)
--       VALUES (new_user_id, 'supervisor'::app_role);
--       
--       RAISE NOTICE 'Créé: Encadreur % (%)', dept.code, new_email;
--     END IF;
--   END LOOP;
-- END $$;

-- ÉTAPE 3: Vérification
SELECT 
  'Total encadreurs' as info,
  COUNT(*) as count
FROM user_roles 
WHERE role = 'supervisor';

-- ÉTAPE 4: Liste des encadreurs par département
SELECT 
  d.code as dept,
  p.first_name,
  p.last_name,
  p.email
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE ur.role = 'supervisor'
ORDER BY d.code, p.last_name;

-- ÉTAPE 5: Statistiques par département
SELECT 
  d.code as department,
  COUNT(DISTINCT CASE WHEN ur.role = 'student' THEN p.id END) as students,
  COUNT(DISTINCT CASE WHEN ur.role = 'supervisor' THEN p.id END) as supervisors
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY d.code
ORDER BY d.code;

-- =====================================================
-- NOTES IMPORTANTES
-- =====================================================
-- 1. Le type app_role est un ENUM, il faut utiliser ::app_role
-- 2. Valeurs possibles: 'student', 'supervisor', 'department_head', 'jury', 'admin'
-- 3. Un utilisateur peut avoir plusieurs rôles
-- 4. Après exécution, rafraîchissez l'interface (F5)
