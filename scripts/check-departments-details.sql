-- Voir tous les départements avec leurs détails
SELECT 
  id,
  code,
  name,
  created_at
FROM departments
ORDER BY code;
