-- =====================================================
-- Script: Export des utilisateurs en CSV
-- Description: Prépare les données pour export CSV
-- Date: 2025-12-02
-- =====================================================

-- ===== EXPORT COMPLET (Format CSV) =====
-- Copier le résultat dans un fichier CSV

SELECT 
  p.id AS "ID",
  p.email AS "Email",
  p.first_name AS "Prénom",
  p.last_name AS "Nom",
  p.student_id AS "Matricule",
  d.code AS "Code Département",
  d.name AS "Nom Département",
  
  -- Rôles (colonnes séparées pour Excel)
  CASE WHEN bool_or(ur.role = 'student') THEN 'Oui' ELSE 'Non' END AS "Est Étudiant",
  CASE WHEN bool_or(ur.role = 'supervisor') THEN 'Oui' ELSE 'Non' END AS "Est Encadreur",
  CASE WHEN bool_or(ur.role = 'department_head') THEN 'Oui' ELSE 'Non' END AS "Est Chef Département",
  CASE WHEN bool_or(ur.role = 'jury') THEN 'Oui' ELSE 'Non' END AS "Est Jury",
  CASE WHEN bool_or(ur.role = 'admin') THEN 'Oui' ELSE 'Non' END AS "Est Admin",
  
  string_agg(DISTINCT ur.role::text, '; ' ORDER BY ur.role::text) AS "Liste Rôles",
  COUNT(DISTINCT ur.role) AS "Nombre Rôles",
  
  TO_CHAR(p.created_at, 'DD/MM/YYYY HH24:MI') AS "Date Création",
  TO_CHAR(MAX(ur.assigned_at), 'DD/MM/YYYY HH24:MI') AS "Dernier Rôle Assigné"
  
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
GROUP BY p.id, p.email, p.first_name, p.last_name, p.student_id, d.code, d.name, p.created_at
ORDER BY d.code, p.last_name, p.first_name;


-- ===== INSTRUCTIONS D'EXPORT =====
/*
MÉTHODE 1 - Via psql (ligne de commande):
\copy (SELECT ... FROM ...) TO '/chemin/vers/fichier.csv' WITH CSV HEADER DELIMITER ';' ENCODING 'UTF8';

MÉTHODE 2 - Via pgAdmin:
1. Exécuter la requête ci-dessus
2. Clic droit sur les résultats
3. "Export" → "CSV"
4. Choisir le délimiteur (;) et l'encodage (UTF-8)

MÉTHODE 3 - Via Supabase Dashboard:
1. Aller dans SQL Editor
2. Exécuter la requête
3. Cliquer sur "Download CSV"

MÉTHODE 4 - Copier-coller dans Excel:
1. Exécuter la requête
2. Sélectionner tous les résultats
3. Copier (Ctrl+C)
4. Coller dans Excel (Ctrl+V)
5. Utiliser "Données" → "Convertir" pour séparer les colonnes
*/


-- ===== EXPORT PAR RÔLE =====

-- Étudiants uniquement
SELECT 
  p.email AS "Email",
  p.first_name AS "Prénom",
  p.last_name AS "Nom",
  p.student_id AS "Matricule",
  d.code AS "Département",
  
  -- Encadreur
  COALESCE(
    (SELECT first_name || ' ' || last_name 
     FROM profiles 
     WHERE id = sa.supervisor_id),
    'Non assigné'
  ) AS "Encadreur",
  
  -- Thème
  COALESCE(tt.title, 'Aucun thème') AS "Thème",
  COALESCE(tt.status, '') AS "Statut Thème",
  
  TO_CHAR(p.created_at, 'DD/MM/YYYY') AS "Date Création"
  
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'student'
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN supervisor_assignments sa ON sa.student_id = p.id AND sa.is_active = TRUE
LEFT JOIN thesis_topics tt ON tt.chosen_by_student_id = p.id
ORDER BY d.code, p.last_name, p.first_name;


-- Encadreurs uniquement
SELECT 
  p.email AS "Email",
  p.first_name AS "Prénom",
  p.last_name AS "Nom",
  d.code AS "Département",
  COUNT(DISTINCT sa.student_id) AS "Nombre Étudiants",
  TO_CHAR(p.created_at, 'DD/MM/YYYY') AS "Date Création"
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'supervisor'
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN supervisor_assignments sa ON sa.supervisor_id = p.id AND sa.is_active = TRUE
GROUP BY p.id, p.email, p.first_name, p.last_name, d.code, p.created_at
ORDER BY d.code, p.last_name;


-- Chefs de département uniquement
SELECT 
  p.email AS "Email",
  p.first_name AS "Prénom",
  p.last_name AS "Nom",
  d.code AS "Code Département",
  d.name AS "Nom Département",
  TO_CHAR(p.created_at, 'DD/MM/YYYY') AS "Date Création"
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'department_head'
LEFT JOIN departments d ON d.id = p.department_id
ORDER BY d.code;


-- Administrateurs uniquement
SELECT 
  p.email AS "Email",
  p.first_name AS "Prénom",
  p.last_name AS "Nom",
  string_agg(
    DISTINCT ur2.role::text, 
    '; ' 
    ORDER BY ur2.role::text
  ) FILTER (WHERE ur2.role != 'admin') AS "Autres Rôles",
  TO_CHAR(ur.assigned_at, 'DD/MM/YYYY') AS "Admin Depuis",
  TO_CHAR(p.created_at, 'DD/MM/YYYY') AS "Compte Créé"
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
LEFT JOIN user_roles ur2 ON ur2.user_id = p.id
GROUP BY p.id, p.email, p.first_name, p.last_name, ur.assigned_at, p.created_at
ORDER BY ur.assigned_at;


-- ===== EXPORT POUR IMPORT DANS AUTRE SYSTÈME =====
-- Format compatible avec la plupart des systèmes

SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.student_id,
  p.department_id,
  d.code AS department_code,
  string_agg(DISTINCT ur.role::text, ',') AS roles,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
GROUP BY p.id, p.email, p.first_name, p.last_name, p.student_id, p.department_id, d.code, p.created_at
ORDER BY p.id;
