-- Vérifier les rôles des utilisateurs

-- 1. Compter les utilisateurs par rôle
SELECT 
  '👥 UTILISATEURS PAR RÔLE' as titre,
  role,
  COUNT(*) as nombre
FROM user_roles
GROUP BY role
ORDER BY role;

-- 2. Lister quelques utilisateurs avec leurs rôles
SELECT 
  '📋 LISTE DES UTILISATEURS' as titre,
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  STRING_AGG(ur.role::text, ', ') as roles
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
GROUP BY p.id, p.email, p.first_name, p.last_name
LIMIT 10;

-- 3. Vérifier les départements
SELECT 
  '🏢 DÉPARTEMENTS' as titre,
  id,
  code,
  name
FROM departments
LIMIT 5;

-- 4. Vérifier les attributions existantes
SELECT 
  '🔗 ATTRIBUTIONS EXISTANTES' as titre,
  sa.id,
  s.email as student_email,
  sup.email as supervisor_email,
  sa.is_active
FROM supervisor_assignments sa
JOIN profiles s ON sa.student_id = s.id
JOIN profiles sup ON sa.supervisor_id = sup.id
LIMIT 5;
