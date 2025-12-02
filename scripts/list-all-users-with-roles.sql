-- =====================================================
-- Script: Liste de tous les utilisateurs avec leurs rôles
-- Description: Affiche tous les comptes du système avec leurs rôles et informations
-- Date: 2025-12-02
-- =====================================================

-- ===== LISTE COMPLÈTE DES UTILISATEURS AVEC RÔLES =====

SELECT 
  p.id AS user_id,
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  p.student_id,
  d.code AS department_code,
  d.name AS department_name,
  
  -- Rôles (affichage sous forme de colonnes booléennes)
  COALESCE(bool_or(ur.role = 'student'), FALSE) AS is_student,
  COALESCE(bool_or(ur.role = 'supervisor'), FALSE) AS is_supervisor,
  COALESCE(bool_or(ur.role = 'department_head'), FALSE) AS is_department_head,
  COALESCE(bool_or(ur.role = 'jury'), FALSE) AS is_jury,
  COALESCE(bool_or(ur.role = 'admin'), FALSE) AS is_admin,
  
  -- Liste des rôles (format texte)
  string_agg(DISTINCT ur.role::text, ', ' ORDER BY ur.role::text) AS roles_list,
  
  -- Nombre de rôles
  COUNT(DISTINCT ur.role) AS roles_count,
  
  -- Dates
  p.created_at AS account_created_at,
  MAX(ur.assigned_at) AS last_role_assigned_at
  
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
GROUP BY p.id, p.email, p.first_name, p.last_name, p.student_id, d.code, d.name, p.created_at
ORDER BY 
  -- Trier par nombre de rôles (décroissant), puis par nom
  COUNT(DISTINCT ur.role) DESC,
  p.last_name,
  p.first_name;


-- ===== STATISTIQUES PAR RÔLE =====

SELECT 
  '--- STATISTIQUES PAR RÔLE ---' AS section;

SELECT 
  role,
  COUNT(DISTINCT user_id) AS user_count,
  ROUND(COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(*) FROM profiles), 2) AS percentage
FROM user_roles
GROUP BY role
ORDER BY user_count DESC;


-- ===== UTILISATEURS AVEC PLUSIEURS RÔLES =====

SELECT 
  '--- UTILISATEURS AVEC PLUSIEURS RÔLES ---' AS section;

SELECT 
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  d.code AS department,
  string_agg(ur.role::text, ', ' ORDER BY ur.role::text) AS roles,
  COUNT(ur.role) AS roles_count
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
GROUP BY p.id, p.email, p.first_name, p.last_name, d.code
HAVING COUNT(ur.role) > 1
ORDER BY COUNT(ur.role) DESC, p.last_name;


-- ===== ÉTUDIANTS =====

SELECT 
  '--- LISTE DES ÉTUDIANTS ---' AS section;

SELECT 
  p.id,
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  p.student_id,
  d.code AS department,
  d.name AS department_name,
  
  -- Encadreur assigné
  CASE 
    WHEN sa.supervisor_id IS NOT NULL THEN 
      (SELECT first_name || ' ' || last_name FROM profiles WHERE id = sa.supervisor_id)
    ELSE 'Non assigné'
  END AS supervisor,
  
  -- Thème
  CASE 
    WHEN tt.id IS NOT NULL THEN tt.title
    ELSE 'Aucun thème'
  END AS theme,
  
  p.created_at
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'student'
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN supervisor_assignments sa ON sa.student_id = p.id AND sa.is_active = TRUE
LEFT JOIN thesis_topics tt ON tt.chosen_by_student_id = p.id
ORDER BY d.code, p.last_name, p.first_name;


-- ===== ENCADREURS =====

SELECT 
  '--- LISTE DES ENCADREURS ---' AS section;

SELECT 
  p.id,
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  d.code AS department,
  d.name AS department_name,
  
  -- Nombre d'étudiants encadrés
  COUNT(DISTINCT sa.student_id) AS students_count,
  
  -- Liste des étudiants (limité à 3 pour lisibilité)
  string_agg(
    DISTINCT (SELECT first_name || ' ' || last_name FROM profiles WHERE id = sa.student_id),
    ', '
    ORDER BY (SELECT first_name || ' ' || last_name FROM profiles WHERE id = sa.student_id)
  ) FILTER (WHERE sa.student_id IS NOT NULL) AS students_list,
  
  p.created_at
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'supervisor'
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN supervisor_assignments sa ON sa.supervisor_id = p.id AND sa.is_active = TRUE
GROUP BY p.id, p.email, p.first_name, p.last_name, d.code, d.name, p.created_at
ORDER BY d.code, COUNT(DISTINCT sa.student_id) DESC, p.last_name;


-- ===== CHEFS DE DÉPARTEMENT =====

SELECT 
  '--- LISTE DES CHEFS DE DÉPARTEMENT ---' AS section;

SELECT 
  p.id,
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  d.code AS department,
  d.name AS department_name,
  
  -- Statistiques du département
  (SELECT COUNT(*) FROM profiles WHERE department_id = d.id AND id IN (SELECT user_id FROM user_roles WHERE role = 'student')) AS total_students,
  (SELECT COUNT(*) FROM profiles WHERE department_id = d.id AND id IN (SELECT user_id FROM user_roles WHERE role = 'supervisor')) AS total_supervisors,
  
  p.created_at
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'department_head'
LEFT JOIN departments d ON d.id = p.department_id
ORDER BY d.code;


-- ===== MEMBRES DU JURY =====

SELECT 
  '--- LISTE DES MEMBRES DU JURY ---' AS section;

SELECT 
  p.id,
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  d.code AS department,
  d.name AS department_name,
  
  -- Nombre de soutenances assignées
  COUNT(DISTINCT djm.defense_session_id) AS defenses_count,
  
  p.created_at
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'jury'
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN defense_jury_members djm ON djm.jury_member_id = p.id
GROUP BY p.id, p.email, p.first_name, p.last_name, d.code, d.name, p.created_at
ORDER BY d.code, COUNT(DISTINCT djm.defense_session_id) DESC, p.last_name;


-- ===== ADMINISTRATEURS =====

SELECT 
  '--- LISTE DES ADMINISTRATEURS ---' AS section;

SELECT 
  p.id,
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  d.code AS department,
  
  -- Autres rôles
  string_agg(
    DISTINCT ur2.role::text, 
    ', ' 
    ORDER BY ur2.role::text
  ) FILTER (WHERE ur2.role != 'admin') AS other_roles,
  
  ur.assigned_at AS admin_since,
  p.created_at AS account_created_at
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
LEFT JOIN user_roles ur2 ON ur2.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
GROUP BY p.id, p.email, p.first_name, p.last_name, d.code, ur.assigned_at, p.created_at
ORDER BY ur.assigned_at;


-- ===== UTILISATEURS SANS RÔLE =====

SELECT 
  '--- UTILISATEURS SANS RÔLE (ATTENTION!) ---' AS section;

SELECT 
  p.id,
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  p.student_id,
  d.code AS department,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE ur.id IS NULL
ORDER BY p.created_at DESC;


-- ===== RÉSUMÉ GLOBAL =====

SELECT 
  '--- RÉSUMÉ GLOBAL ---' AS section;

SELECT 
  'Total utilisateurs' AS metric,
  COUNT(*) AS count
FROM profiles
UNION ALL
SELECT 
  'Utilisateurs avec rôles' AS metric,
  COUNT(DISTINCT user_id) AS count
FROM user_roles
UNION ALL
SELECT 
  'Utilisateurs sans rôle' AS metric,
  COUNT(*) AS count
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.id IS NULL
UNION ALL
SELECT 
  'Étudiants' AS metric,
  COUNT(DISTINCT user_id) AS count
FROM user_roles
WHERE role = 'student'
UNION ALL
SELECT 
  'Encadreurs' AS metric,
  COUNT(DISTINCT user_id) AS count
FROM user_roles
WHERE role = 'supervisor'
UNION ALL
SELECT 
  'Chefs de département' AS metric,
  COUNT(DISTINCT user_id) AS count
FROM user_roles
WHERE role = 'department_head'
UNION ALL
SELECT 
  'Membres du jury' AS metric,
  COUNT(DISTINCT user_id) AS count
FROM user_roles
WHERE role = 'jury'
UNION ALL
SELECT 
  'Administrateurs' AS metric,
  COUNT(DISTINCT user_id) AS count
FROM user_roles
WHERE role = 'admin'
UNION ALL
SELECT 
  'Utilisateurs multi-rôles' AS metric,
  COUNT(*) AS count
FROM (
  SELECT user_id
  FROM user_roles
  GROUP BY user_id
  HAVING COUNT(*) > 1
) AS multi_role_users;


-- ===== RÉPARTITION PAR DÉPARTEMENT =====

SELECT 
  '--- RÉPARTITION PAR DÉPARTEMENT ---' AS section;

SELECT 
  d.code,
  d.name,
  COUNT(DISTINCT CASE WHEN ur.role = 'student' THEN p.id END) AS students,
  COUNT(DISTINCT CASE WHEN ur.role = 'supervisor' THEN p.id END) AS supervisors,
  COUNT(DISTINCT CASE WHEN ur.role = 'department_head' THEN p.id END) AS dept_heads,
  COUNT(DISTINCT CASE WHEN ur.role = 'jury' THEN p.id END) AS jury_members,
  COUNT(DISTINCT p.id) AS total_users
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY d.id, d.code, d.name
ORDER BY d.code;


-- ===== ACTIVITÉ RÉCENTE =====

SELECT 
  '--- COMPTES CRÉÉS RÉCEMMENT (30 derniers jours) ---' AS section;

SELECT 
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  d.code AS department,
  string_agg(DISTINCT ur.role::text, ', ' ORDER BY ur.role::text) AS roles,
  p.created_at,
  EXTRACT(DAY FROM NOW() - p.created_at) AS days_ago
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE p.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id, p.email, p.first_name, p.last_name, d.code, p.created_at
ORDER BY p.created_at DESC;


-- ===== NOTES =====
/*
LÉGENDE DES RÔLES:
- student: Étudiant
- supervisor: Encadreur
- department_head: Chef de département
- jury: Membre du jury
- admin: Administrateur système

UTILISATION:
1. Exécuter ce script dans psql ou pgAdmin
2. Les résultats sont organisés par sections
3. Chaque section est précédée d'un titre explicatif

EXPORT:
Pour exporter en CSV:
\copy (SELECT * FROM ...) TO '/path/to/file.csv' WITH CSV HEADER;

Pour exporter en JSON:
SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM ...) t;
*/
