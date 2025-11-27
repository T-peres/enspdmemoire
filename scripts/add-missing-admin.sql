-- =====================================================
-- AJOUTER L'UTILISATEUR ADMIN MANQUANT
-- =====================================================

-- Vérifier si admin existe déjà
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@enspd.cm') THEN
    RAISE NOTICE '✅ L''admin existe déjà';
  ELSE
    RAISE NOTICE '⚠️  L''admin n''existe pas, création en cours...';
  END IF;
END $$;

-- Créer le profil admin
INSERT INTO profiles (id, email, first_name, last_name)
SELECT 
  id,
  email,
  'Admin',
  'ENSPD'
FROM auth.users
WHERE email = 'admin@enspd.cm'
ON CONFLICT (id) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- Créer le rôle admin
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@enspd.cm'
ON CONFLICT (user_id, role) DO NOTHING;

-- Vérification
SELECT 
  p.email as "Email",
  p.first_name || ' ' || p.last_name as "Nom",
  ur.role as "Rôle",
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = p.id) THEN '✅ OK'
    ELSE '❌ Manquant dans Auth'
  END as "Statut"
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email = 'admin@enspd.cm';

-- Message
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@enspd.cm') THEN
    RAISE NOTICE '✅ Admin créé avec succès !';
    RAISE NOTICE 'Email: admin@enspd.cm';
    RAISE NOTICE 'Password: Test123!';
  ELSE
    RAISE NOTICE '❌ Erreur: L''utilisateur admin@enspd.cm doit d''abord être créé dans Authentication > Users';
  END IF;
END $$;
