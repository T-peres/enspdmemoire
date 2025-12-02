-- =====================================================
-- Script: Liste rapide des utilisateurs
-- Description: Affichage simple et rapide de tous les comptes
-- Date: 2025-12-02
-- =====================================================

-- ===== LISTE SIMPLE DE TOUS LES UTILISATEURS =====

SELECT 
  ROW_NUMBER() OVER (ORDER BY p.last_name, p.first_name) AS "#",
  p.email AS "Email",
  p.first_name || ' ' || p.last_name AS "Nom Complet",
  p.student_id AS "Matricule",
  d.code AS "Département",
  
  -- Rôles avec emojis pour meilleure lisibilité
  CASE WHEN bool_or(ur.role = 'student') THEN '🎓' ELSE '' END ||
  CASE WHEN bool_or(ur.role = 'supervisor') THEN '👨‍🏫' ELSE '' END ||
  CASE WHEN bool_or(ur.role = 'department_head') THEN '🏛️' ELSE '' END ||
  CASE WHEN bool_or(ur.role = 'jury') THEN '⚖️' ELSE '' END ||
  CASE WHEN bool_or(ur.role = 'admin') THEN '👑' ELSE '' END AS "Rôles",
  
  string_agg(DISTINCT ur.role::text, ', ' ORDER BY ur.role::text) AS "Rôles (texte)",
  
  TO_CHAR(p.created_at, 'DD/MM/YYYY') AS "Date création"
  
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
GROUP BY p.id, p.email, p.first_name, p.last_name, p.student_id, d.code, p.created_at
ORDER BY p.last_name, p.first_name;


-- ===== LÉGENDE =====
/*
🎓 = Étudiant (student)
👨‍🏫 = Encadreur (supervisor)
🏛️ = Chef de département (department_head)
⚖️ = Membre du jury (jury)
👑 = Administrateur (admin)
*/


-- ===== COMPTEURS RAPIDES =====

SELECT 
  '📊 STATISTIQUES RAPIDES' AS "Section";

SELECT 
  'Total utilisateurs' AS "Métrique",
  COUNT(*) AS "Nombre"
FROM profiles
UNION ALL
SELECT 
  '🎓 Étudiants',
  COUNT(DISTINCT user_id)
FROM user_roles WHERE role = 'student'
UNION ALL
SELECT 
  '👨‍🏫 Encadreurs',
  COUNT(DISTINCT user_id)
FROM user_roles WHERE role = 'supervisor'
UNION ALL
SELECT 
  '🏛️ Chefs de département',
  COUNT(DISTINCT user_id)
FROM user_roles WHERE role = 'department_head'
UNION ALL
SELECT 
  '⚖️ Membres du jury',
  COUNT(DISTINCT user_id)
FROM user_roles WHERE role = 'jury'
UNION ALL
SELECT 
  '👑 Administrateurs',
  COUNT(DISTINCT user_id)
FROM user_roles WHERE role = 'admin';


-- ===== RECHERCHE PAR EMAIL =====
-- Décommenter et modifier l'email pour rechercher un utilisateur spécifique
/*
SELECT 
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  p.student_id,
  d.code AS department,
  string_agg(ur.role::text, ', ') AS roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE p.email ILIKE '%@example.com%'  -- Modifier ici
GROUP BY p.id, p.email, p.first_name, p.last_name, p.student_id, d.code;
*/


-- ===== RECHERCHE PAR DÉPARTEMENT =====
-- Décommenter et modifier le code département pour filtrer
/*
SELECT 
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  string_agg(ur.role::text, ', ') AS roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE d.code = 'GIT'  -- Modifier ici (GIT, GESI, GQHSE, etc.)
GROUP BY p.id, p.email, p.first_name, p.last_name;
*/
