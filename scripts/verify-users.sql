-- =====================================================
-- VÉRIFIER LES UTILISATEURS CRÉÉS
-- =====================================================

-- 1. Vérifier les utilisateurs dans auth.users
SELECT 
  'Utilisateurs Auth' as "Type",
  COUNT(*) as "Nombre"
FROM auth.users
WHERE email LIKE '%@enspd.cm';

-- 2. Vérifier les profils
SELECT 
  'Profils' as "Type",
  COUNT(*) as "Nombre"
FROM profiles
WHERE email LIKE '%@enspd.cm';

-- 3. Liste détaillée des utilisateurs
SELECT 
  p.email as "Email",
  p.first_name || ' ' || p.last_name as "Nom",
  p.student_id as "Matricule",
  d.code as "Département",
  ur.role as "Rôle",
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = p.id) THEN '✅'
    ELSE '❌'
  END as "Auth OK"
FROM profiles p
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email LIKE '%@enspd.cm'
ORDER BY p.email;

-- 4. Compter par rôle
SELECT 
  role as "Rôle",
  COUNT(*) as "Nombre"
FROM user_roles ur
JOIN profiles p ON ur.user_id = p.id
WHERE p.email LIKE '%@enspd.cm'
GROUP BY role
ORDER BY role;

-- 5. Vérifier si admin existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@enspd.cm') THEN '✅ Admin existe'
    ELSE '❌ Admin manquant'
  END as "Statut Admin";

-- 6. Vérifier les utilisateurs manquants
SELECT 
  email as "Email Manquant"
FROM (
  VALUES 
    ('admin@enspd.cm'),
    ('chef.dept@enspd.cm'),
    ('encadreur1@enspd.cm'),
    ('encadreur2@enspd.cm'),
    ('etudiant1@enspd.cm'),
    ('etudiant2@enspd.cm'),
    ('etudiant3@enspd.cm'),
    ('jury1@enspd.cm')
) AS expected(email)
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.email = expected.email
);
