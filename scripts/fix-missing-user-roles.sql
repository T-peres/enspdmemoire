-- =====================================================
-- Script: Correction des rôles utilisateurs manquants
-- Description: Ajouter les rôles manquants aux utilisateurs
-- =====================================================

-- 1. Vérifier l'utilisateur actuel
SELECT 
  'Utilisateur actuel' as info,
  auth.uid() as user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.department_id,
  d.code as department_code,
  d.name as department_name
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
WHERE p.id = auth.uid();

-- 2. Vérifier les rôles actuels
SELECT 
  'Rôles actuels' as info,
  COALESCE(array_agg(role), ARRAY[]::app_role[]) as roles
FROM user_roles
WHERE user_id = auth.uid();

-- 3. Lister tous les utilisateurs sans rôles
SELECT 
  'Utilisateurs sans rôles' as info,
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  d.code as department
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.id IS NULL
ORDER BY p.email;

-- =====================================================
-- CORRECTION: Ajouter le rôle department_head à l'utilisateur actuel
-- =====================================================
-- ATTENTION: Décommentez et modifiez selon vos besoins

-- Option 1: Ajouter le rôle department_head à l'utilisateur actuel
-- INSERT INTO user_roles (user_id, role, assigned_by)
-- VALUES (auth.uid(), 'department_head', auth.uid())
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Option 2: Ajouter le rôle à un utilisateur spécifique par email
-- INSERT INTO user_roles (user_id, role, assigned_by)
-- SELECT id, 'department_head', id
-- FROM profiles
-- WHERE email = 'votre.email@example.com'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Option 3: Ajouter plusieurs rôles à un utilisateur
-- INSERT INTO user_roles (user_id, role, assigned_by)
-- SELECT id, role, id
-- FROM profiles,
-- LATERAL (VALUES ('department_head'), ('supervisor')) AS roles(role)
-- WHERE email = 'votre.email@example.com'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- EXEMPLES DE CORRECTION POUR DIFFÉRENTS CAS
-- =====================================================

-- Cas 1: Vous êtes chef de département
-- Décommentez cette ligne pour vous ajouter le rôle:
/*
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES (auth.uid(), 'department_head', auth.uid())
ON CONFLICT (user_id, role) DO NOTHING;
*/

-- Cas 2: Vous êtes encadreur
-- Décommentez cette ligne:
/*
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES (auth.uid(), 'supervisor', auth.uid())
ON CONFLICT (user_id, role) DO NOTHING;
*/

-- Cas 3: Vous êtes étudiant
-- Décommentez cette ligne:
/*
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES (auth.uid(), 'student', auth.uid())
ON CONFLICT (user_id, role) DO NOTHING;
*/

-- Cas 4: Vous êtes admin (tous les droits)
-- Décommentez cette ligne:
/*
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES (auth.uid(), 'admin', auth.uid())
ON CONFLICT (user_id, role) DO NOTHING;
*/

-- =====================================================
-- VÉRIFICATION APRÈS CORRECTION
-- =====================================================

-- Vérifier que le rôle a été ajouté
SELECT 
  'Vérification finale' as info,
  p.email,
  array_agg(ur.role) as roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.id = auth.uid()
GROUP BY p.id, p.email;

-- =====================================================
-- SCRIPT POUR AJOUTER DES RÔLES À PLUSIEURS UTILISATEURS
-- =====================================================

-- Exemple: Ajouter le rôle department_head à tous les utilisateurs d'un département
/*
INSERT INTO user_roles (user_id, role, assigned_by)
SELECT 
  p.id,
  'department_head',
  (SELECT id FROM profiles WHERE email = 'admin@example.com' LIMIT 1)
FROM profiles p
JOIN departments d ON d.id = p.department_id
WHERE d.code = 'GIT'  -- Remplacez par le code de votre département
ON CONFLICT (user_id, role) DO NOTHING;
*/

-- Exemple: Ajouter le rôle supervisor à plusieurs utilisateurs par email
/*
INSERT INTO user_roles (user_id, role, assigned_by)
SELECT 
  p.id,
  'supervisor',
  (SELECT id FROM profiles WHERE email = 'admin@example.com' LIMIT 1)
FROM profiles p
WHERE p.email IN (
  'encadreur1@example.com',
  'encadreur2@example.com',
  'encadreur3@example.com'
)
ON CONFLICT (user_id, role) DO NOTHING;
*/

-- Exemple: Ajouter le rôle student à tous les utilisateurs avec un student_id
/*
INSERT INTO user_roles (user_id, role, assigned_by)
SELECT 
  p.id,
  'student',
  (SELECT id FROM profiles WHERE email = 'admin@example.com' LIMIT 1)
FROM profiles p
WHERE p.student_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;
*/
