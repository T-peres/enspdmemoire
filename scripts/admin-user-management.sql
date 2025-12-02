-- =====================================================
-- Script: Gestion administrative des utilisateurs
-- Description: Actions courantes d'administration des comptes
-- Date: 2025-12-02
-- ⚠️ ATTENTION: Ces commandes modifient la base de données !
-- =====================================================

-- ===== AJOUTER UN RÔLE À UN UTILISATEUR =====

-- Exemple: Ajouter le rôle "supervisor" à un utilisateur
/*
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES (
  (SELECT id FROM profiles WHERE email = 'user@example.com'),
  'supervisor',
  (SELECT id FROM profiles WHERE email = 'admin@example.com')  -- Qui assigne le rôle
)
ON CONFLICT (user_id, role) DO NOTHING;
*/


-- ===== RETIRER UN RÔLE À UN UTILISATEUR =====

-- Exemple: Retirer le rôle "supervisor" d'un utilisateur
/*
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM profiles WHERE email = 'user@example.com')
  AND role = 'supervisor';
*/


-- ===== CHANGER LE DÉPARTEMENT D'UN UTILISATEUR =====

-- Exemple: Déplacer un utilisateur vers un autre département
/*
UPDATE profiles
SET department_id = (SELECT id FROM departments WHERE code = 'GIT')
WHERE email = 'user@example.com';
*/


-- ===== CRÉER UN NOUVEL UTILISATEUR AVEC RÔLES =====

-- Exemple: Créer un encadreur
/*
-- 1. Créer le profil (l'utilisateur doit d'abord s'inscrire via Supabase Auth)
-- 2. Ajouter les informations dans profiles
INSERT INTO profiles (id, email, first_name, last_name, department_id)
VALUES (
  '<uuid-from-auth-users>',
  'nouveau.encadreur@enspd.cm',
  'Prénom',
  'Nom',
  (SELECT id FROM departments WHERE code = 'GIT')
);

-- 3. Assigner le rôle
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM profiles WHERE email = 'nouveau.encadreur@enspd.cm'),
  'supervisor'
);
*/


-- ===== PROMOUVOIR UN UTILISATEUR EN ADMINISTRATEUR =====

-- ⚠️ ATTENTION: À utiliser avec précaution !
/*
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES (
  (SELECT id FROM profiles WHERE email = 'user@example.com'),
  'admin',
  (SELECT id FROM profiles WHERE email = 'current.admin@example.com')
)
ON CONFLICT (user_id, role) DO NOTHING;
*/


-- ===== RÉVOQUER LES DROITS ADMINISTRATEUR =====

/*
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM profiles WHERE email = 'user@example.com')
  AND role = 'admin';
*/


-- ===== ATTRIBUER UN ENCADREUR À UN ÉTUDIANT =====

/*
-- Désactiver les anciennes attributions
UPDATE supervisor_assignments
SET is_active = FALSE
WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant@example.com')
  AND is_active = TRUE;

-- Créer la nouvelle attribution
INSERT INTO supervisor_assignments (student_id, supervisor_id, assigned_by)
VALUES (
  (SELECT id FROM profiles WHERE email = 'etudiant@example.com'),
  (SELECT id FROM profiles WHERE email = 'encadreur@example.com'),
  (SELECT id FROM profiles WHERE email = 'chef.dept@example.com')
);
*/


-- ===== RETIRER UN ENCADREUR D'UN ÉTUDIANT =====

/*
UPDATE supervisor_assignments
SET is_active = FALSE
WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant@example.com')
  AND is_active = TRUE;
*/


-- ===== DÉSACTIVER UN COMPTE UTILISATEUR =====

-- Note: Supabase Auth gère l'activation/désactivation des comptes
-- Cette commande supprime les rôles mais garde le profil
/*
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM profiles WHERE email = 'user@example.com');
*/


-- ===== SUPPRIMER COMPLÈTEMENT UN UTILISATEUR =====

-- ⚠️ ATTENTION: Cette action est irréversible !
-- Supprime le profil et tous les rôles (cascade)
/*
DELETE FROM profiles
WHERE email = 'user@example.com';
*/


-- ===== RÉINITIALISER LES RÔLES D'UN UTILISATEUR =====

-- Supprimer tous les rôles puis en ajouter un nouveau
/*
-- 1. Supprimer tous les rôles
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM profiles WHERE email = 'user@example.com');

-- 2. Ajouter le nouveau rôle
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM profiles WHERE email = 'user@example.com'),
  'student'
);
*/


-- ===== CRÉER UN CHEF DE DÉPARTEMENT =====

/*
-- 1. Vérifier que l'utilisateur existe
SELECT id, email, first_name, last_name 
FROM profiles 
WHERE email = 'chef@example.com';

-- 2. Assigner au département
UPDATE profiles
SET department_id = (SELECT id FROM departments WHERE code = 'GIT')
WHERE email = 'chef@example.com';

-- 3. Ajouter le rôle
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM profiles WHERE email = 'chef@example.com'),
  'department_head'
)
ON CONFLICT (user_id, role) DO NOTHING;
*/


-- ===== AJOUTER UN MEMBRE DU JURY =====

/*
INSERT INTO user_roles (user_id, role)
VALUES (
  (SELECT id FROM profiles WHERE email = 'jury@example.com'),
  'jury'
)
ON CONFLICT (user_id, role) DO NOTHING;
*/


-- ===== MIGRATION EN MASSE - Ajouter un rôle à plusieurs utilisateurs =====

-- Exemple: Ajouter le rôle "jury" à tous les encadreurs d'un département
/*
INSERT INTO user_roles (user_id, role)
SELECT DISTINCT p.id, 'jury'
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
JOIN departments d ON d.id = p.department_id
WHERE ur.role = 'supervisor'
  AND d.code = 'GIT'
ON CONFLICT (user_id, role) DO NOTHING;
*/


-- ===== VÉRIFICATIONS AVANT MODIFICATIONS =====

-- Vérifier qu'un utilisateur existe
SELECT id, email, first_name, last_name, department_id
FROM profiles
WHERE email = 'user@example.com';

-- Vérifier les rôles actuels d'un utilisateur
SELECT ur.role, ur.assigned_at
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE p.email = 'user@example.com';

-- Vérifier le département d'un utilisateur
SELECT p.email, d.code, d.name
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
WHERE p.email = 'user@example.com';

-- Vérifier les étudiants d'un encadreur
SELECT 
  s.email AS student_email,
  s.first_name || ' ' || s.last_name AS student_name
FROM supervisor_assignments sa
JOIN profiles s ON s.id = sa.student_id
JOIN profiles sup ON sup.id = sa.supervisor_id
WHERE sup.email = 'encadreur@example.com'
  AND sa.is_active = TRUE;


-- ===== AUDIT - Tracer les modifications =====

-- Voir l'historique des rôles assignés
SELECT 
  p.email,
  ur.role,
  ur.assigned_at,
  assigned_by.email AS assigned_by_email
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
LEFT JOIN profiles assigned_by ON assigned_by.id = ur.assigned_by
WHERE p.email = 'user@example.com'
ORDER BY ur.assigned_at DESC;


-- ===== NETTOYAGE - Supprimer les doublons =====

-- Identifier les doublons de rôles (ne devrait pas arriver avec UNIQUE constraint)
SELECT user_id, role, COUNT(*)
FROM user_roles
GROUP BY user_id, role
HAVING COUNT(*) > 1;

-- Supprimer les doublons (garder le plus récent)
/*
DELETE FROM user_roles
WHERE id NOT IN (
  SELECT MAX(id)
  FROM user_roles
  GROUP BY user_id, role
);
*/


-- ===== STATISTIQUES APRÈS MODIFICATIONS =====

-- Compter les utilisateurs par rôle
SELECT role, COUNT(DISTINCT user_id) AS count
FROM user_roles
GROUP BY role
ORDER BY count DESC;

-- Vérifier la cohérence des données
SELECT 
  'Utilisateurs sans rôle' AS check_name,
  COUNT(*) AS count
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.id IS NULL
UNION ALL
SELECT 
  'Étudiants sans encadreur',
  COUNT(*)
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'student'
LEFT JOIN supervisor_assignments sa ON sa.student_id = p.id AND sa.is_active = TRUE
WHERE sa.id IS NULL;


-- ===== NOTES IMPORTANTES =====
/*
⚠️ ATTENTION:
1. Toujours faire une sauvegarde avant des modifications en masse
2. Tester les requêtes sur un environnement de développement d'abord
3. Utiliser des transactions pour les modifications multiples
4. Vérifier les contraintes de clés étrangères
5. Documenter toutes les modifications importantes

📝 BONNES PRATIQUES:
1. Utiliser ON CONFLICT pour éviter les doublons
2. Toujours vérifier l'existence des utilisateurs avant modification
3. Tracer qui fait les modifications (assigned_by)
4. Garder un historique des changements
5. Tester avec SELECT avant d'utiliser UPDATE/DELETE

🔐 SÉCURITÉ:
1. Limiter l'accès à ces scripts aux administrateurs
2. Ne jamais partager les identifiants de base de données
3. Utiliser des rôles PostgreSQL avec permissions limitées
4. Auditer régulièrement les comptes administrateurs
5. Révoquer les accès inutilisés

📊 AUDIT:
1. Vérifier régulièrement les utilisateurs sans rôle
2. Contrôler les comptes administrateurs
3. Surveiller les attributions encadreur-étudiant
4. Vérifier la cohérence des départements
5. Auditer les modifications récentes
*/
