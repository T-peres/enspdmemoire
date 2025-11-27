-- =====================================================
-- CORRECTION RAPIDE: Ajouter des encadreurs
-- Date: 2025-11-27
-- =====================================================

-- ÉTAPE 1: Diagnostic rapide
SELECT 
  'Étudiants' as type,
  COUNT(*) as count
FROM user_roles WHERE role = 'student'
UNION ALL
SELECT 
  'Encadreurs' as type,
  COUNT(*) as count
FROM user_roles WHERE role = 'supervisor'
UNION ALL
SELECT 
  'Chefs de département' as type,
  COUNT(*) as count
FROM user_roles WHERE role = 'department_head';

-- ÉTAPE 2: Voir tous les utilisateurs et leurs rôles
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  d.code as dept,
  STRING_AGG(ur.role::text, ', ') as roles
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.email, p.first_name, p.last_name, d.code
ORDER BY d.code, p.last_name;

-- ÉTAPE 3: CORRECTION - Ajouter le rôle supervisor aux utilisateurs appropriés
-- Méthode 1: Par email (RECOMMANDÉ - Remplacez par vos emails réels)
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'supervisor'::app_role
FROM profiles p
WHERE p.email IN (
  -- Remplacez ces emails par ceux de vos encadreurs réels
  'encadreur1@enspd.cm',
  'encadreur2@enspd.cm',
  'prof.dupont@enspd.cm'
  -- Ajoutez d'autres emails ici
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Méthode 2: Par ID (si vous connaissez les IDs)
-- INSERT INTO user_roles (user_id, role)
-- VALUES 
--   ('uuid-encadreur-1', 'supervisor'::app_role),
--   ('uuid-encadreur-2', 'supervisor'::app_role)
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Méthode 3: Automatique - Tous les non-étudiants deviennent encadreurs
-- ATTENTION: Vérifiez bien avant d'exécuter!
-- INSERT INTO user_roles (user_id, role)
-- SELECT p.id, 'supervisor'::app_role
-- FROM profiles p
-- WHERE p.id NOT IN (
--   SELECT user_id FROM user_roles 
--   WHERE role IN ('student', 'admin')
-- )
-- ON CONFLICT (user_id, role) DO NOTHING;

-- ÉTAPE 4: Vérification
SELECT 
  d.code as dept,
  COUNT(DISTINCT CASE WHEN ur.role = 'supervisor' THEN p.id END) as supervisors,
  COUNT(DISTINCT CASE WHEN ur.role = 'student' THEN p.id END) as students
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY d.code
ORDER BY d.code;

-- ÉTAPE 5: Lister les nouveaux encadreurs
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  d.code as department
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE ur.role = 'supervisor'
ORDER BY d.code, p.last_name;
