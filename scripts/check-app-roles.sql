-- Vérifier les valeurs de l'enum app_role
SELECT 
  enumlabel as role_name,
  enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'app_role'
)
ORDER BY enumsortorder;

-- Vérifier les rôles actuellement utilisés dans user_roles
SELECT DISTINCT role, COUNT(*) as count
FROM user_roles
GROUP BY role
ORDER BY role;
