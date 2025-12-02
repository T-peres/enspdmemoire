-- Vérifier les départements dans la base de données
SELECT 
  id,
  code,
  name,
  description,
  created_at,
  updated_at
FROM departments
ORDER BY code;

-- Compter le nombre de départements
SELECT COUNT(*) as total_departments FROM departments;
