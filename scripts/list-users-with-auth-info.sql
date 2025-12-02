-- =====================================================
-- Script: Liste des utilisateurs avec informations d'authentification
-- Description: Affiche les infos d'auth disponibles (SANS les mots de passe)
-- Date: 2025-12-02
-- ⚠️ NOTE: Les mots de passe sont hashés et ne peuvent pas être récupérés
-- =====================================================

-- ===== INFORMATIONS D'AUTHENTIFICATION DISPONIBLES =====

SELECT 
  au.id AS auth_user_id,
  au.email,
  p.first_name || ' ' || p.last_name AS full_name,
  d.code AS department,
  
  -- Informations d'authentification
  au.email_confirmed_at AS email_verified,
  au.phone,
  au.phone_confirmed_at AS phone_verified,
  
  -- Statut du compte
  au.banned_until,
  CASE 
    WHEN au.banned_until IS NOT NULL AND au.banned_until > NOW() THEN '🔒 Banni'
    WHEN au.email_confirmed_at IS NULL THEN '⚠️ Email non vérifié'
    ELSE '✅ Actif'
  END AS account_status,
  
  -- Dernière connexion
  au.last_sign_in_at,
  CASE 
    WHEN au.last_sign_in_at IS NULL THEN 'Jamais connecté'
    WHEN au.last_sign_in_at > NOW() - INTERVAL '1 day' THEN '🟢 Aujourd''hui'
    WHEN au.last_sign_in_at > NOW() - INTERVAL '7 days' THEN '🟡 Cette semaine'
    WHEN au.last_sign_in_at > NOW() - INTERVAL '30 days' THEN '🟠 Ce mois'
    ELSE '🔴 Inactif'
  END AS activity_status,
  
  -- Nombre de connexions (si disponible)
  au.confirmation_sent_at,
  au.recovery_sent_at,
  
  -- Rôles
  string_agg(DISTINCT ur.role::text, ', ' ORDER BY ur.role::text) AS roles,
  
  -- Dates
  au.created_at AS account_created,
  au.updated_at AS last_updated
  
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN departments d ON d.id = p.department_id
GROUP BY 
  au.id, au.email, p.first_name, p.last_name, d.code,
  au.email_confirmed_at, au.phone, au.phone_confirmed_at,
  au.banned_until, au.last_sign_in_at, au.confirmation_sent_at,
  au.recovery_sent_at, au.created_at, au.updated_at
ORDER BY au.last_sign_in_at DESC NULLS LAST;


-- ===== STATISTIQUES D'AUTHENTIFICATION =====

SELECT 
  '--- STATISTIQUES D''AUTHENTIFICATION ---' AS section;

SELECT 
  'Total comptes' AS metric,
  COUNT(*) AS count
FROM auth.users
UNION ALL
SELECT 
  'Emails vérifiés',
  COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL)
FROM auth.users
UNION ALL
SELECT 
  'Emails non vérifiés',
  COUNT(*) FILTER (WHERE email_confirmed_at IS NULL)
FROM auth.users
UNION ALL
SELECT 
  'Jamais connectés',
  COUNT(*) FILTER (WHERE last_sign_in_at IS NULL)
FROM auth.users
UNION ALL
SELECT 
  'Connectés aujourd''hui',
  COUNT(*) FILTER (WHERE last_sign_in_at > NOW() - INTERVAL '1 day')
FROM auth.users
UNION ALL
SELECT 
  'Connectés cette semaine',
  COUNT(*) FILTER (WHERE last_sign_in_at > NOW() - INTERVAL '7 days')
FROM auth.users
UNION ALL
SELECT 
  'Comptes bannis',
  COUNT(*) FILTER (WHERE banned_until IS NOT NULL AND banned_until > NOW())
FROM auth.users;


-- ===== COMPTES JAMAIS CONNECTÉS =====

SELECT 
  '--- COMPTES JAMAIS CONNECTÉS ---' AS section;

SELECT 
  au.email,
  p.first_name || ' ' || p.last_name AS full_name,
  d.code AS department,
  string_agg(DISTINCT ur.role::text, ', ') AS roles,
  CASE 
    WHEN au.email_confirmed_at IS NULL THEN '⚠️ Email non vérifié'
    ELSE '✅ Email vérifié'
  END AS email_status,
  TO_CHAR(au.created_at, 'DD/MM/YYYY HH24:MI') AS created_at,
  EXTRACT(DAY FROM NOW() - au.created_at) AS days_since_creation
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE au.last_sign_in_at IS NULL
GROUP BY au.id, au.email, p.first_name, p.last_name, d.code, au.email_confirmed_at, au.created_at
ORDER BY au.created_at DESC;


-- ===== COMPTES INACTIFS (> 30 jours) =====

SELECT 
  '--- COMPTES INACTIFS (> 30 jours) ---' AS section;

SELECT 
  au.email,
  p.first_name || ' ' || p.last_name AS full_name,
  d.code AS department,
  string_agg(DISTINCT ur.role::text, ', ') AS roles,
  TO_CHAR(au.last_sign_in_at, 'DD/MM/YYYY HH24:MI') AS last_login,
  EXTRACT(DAY FROM NOW() - au.last_sign_in_at) AS days_inactive
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE au.last_sign_in_at IS NOT NULL
  AND au.last_sign_in_at < NOW() - INTERVAL '30 days'
GROUP BY au.id, au.email, p.first_name, p.last_name, d.code, au.last_sign_in_at
ORDER BY au.last_sign_in_at ASC;


-- ===== COMPTES AVEC EMAIL NON VÉRIFIÉ =====

SELECT 
  '--- COMPTES AVEC EMAIL NON VÉRIFIÉ ---' AS section;

SELECT 
  au.email,
  p.first_name || ' ' || p.last_name AS full_name,
  d.code AS department,
  string_agg(DISTINCT ur.role::text, ', ') AS roles,
  TO_CHAR(au.created_at, 'DD/MM/YYYY') AS created_at,
  EXTRACT(DAY FROM NOW() - au.created_at) AS days_ago
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE au.email_confirmed_at IS NULL
GROUP BY au.id, au.email, p.first_name, p.last_name, d.code, au.created_at
ORDER BY au.created_at DESC;


-- ===== ACTIVITÉ RÉCENTE =====

SELECT 
  '--- ACTIVITÉ RÉCENTE (7 derniers jours) ---' AS section;

SELECT 
  au.email,
  p.first_name || ' ' || p.last_name AS full_name,
  d.code AS department,
  string_agg(DISTINCT ur.role::text, ', ') AS roles,
  TO_CHAR(au.last_sign_in_at, 'DD/MM/YYYY HH24:MI') AS last_login,
  EXTRACT(HOUR FROM NOW() - au.last_sign_in_at) AS hours_ago
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE au.last_sign_in_at > NOW() - INTERVAL '7 days'
GROUP BY au.id, au.email, p.first_name, p.last_name, d.code, au.last_sign_in_at
ORDER BY au.last_sign_in_at DESC;


-- ===== INFORMATIONS IMPORTANTES =====
/*
⚠️ SÉCURITÉ - MOTS DE PASSE:

Les mots de passe ne sont PAS stockés en clair dans la base de données.
Supabase utilise bcrypt pour hasher les mots de passe de manière irréversible.

Ce qui est stocké dans auth.users:
- encrypted_password: Hash bcrypt du mot de passe (IMPOSSIBLE à déchiffrer)
- email: Adresse email de l'utilisateur
- email_confirmed_at: Date de vérification de l'email
- last_sign_in_at: Dernière connexion
- created_at: Date de création du compte

Ce qui N'EST PAS accessible:
- ❌ Mot de passe en clair
- ❌ Mot de passe déchiffré
- ❌ Mot de passe original

POUR RÉINITIALISER UN MOT DE PASSE:
1. Via l'interface Supabase Dashboard:
   - Aller dans Authentication → Users
   - Cliquer sur l'utilisateur
   - "Send password recovery email"

2. Via SQL (envoyer un email de réinitialisation):
   SELECT auth.send_password_reset_email('user@example.com');

3. Via l'API Supabase:
   supabase.auth.resetPasswordForEmail('user@example.com')

POUR CRÉER UN NOUVEAU COMPTE AVEC MOT DE PASSE:
1. Via Supabase Dashboard:
   - Authentication → Users → Add user
   - Entrer email et mot de passe

2. Via SQL (nécessite des privilèges spéciaux):
   -- Non recommandé, utiliser l'API Supabase

3. Via l'API Supabase (recommandé):
   supabase.auth.signUp({
     email: 'user@example.com',
     password: 'secure_password_here'
   })

BONNES PRATIQUES:
✅ Utiliser des mots de passe forts (min 8 caractères, majuscules, minuscules, chiffres, symboles)
✅ Forcer la vérification de l'email
✅ Implémenter une politique de réinitialisation de mot de passe
✅ Surveiller les comptes inactifs
✅ Désactiver les comptes suspects
✅ Auditer régulièrement les connexions

POLITIQUE DE MOT DE PASSE RECOMMANDÉE:
- Minimum 8 caractères
- Au moins 1 majuscule
- Au moins 1 minuscule
- Au moins 1 chiffre
- Au moins 1 caractère spécial
- Pas de mots du dictionnaire
- Expiration tous les 90 jours (optionnel)
- Historique des 5 derniers mots de passe
*/


-- ===== EXPORT POUR RÉINITIALISATION DE MASSE =====
-- Liste des emails pour envoyer des réinitialisations de mot de passe

SELECT 
  '--- EMAILS POUR RÉINITIALISATION ---' AS section;

SELECT 
  au.email,
  p.first_name || ' ' || p.last_name AS full_name,
  CASE 
    WHEN au.last_sign_in_at IS NULL THEN 'Jamais connecté'
    WHEN au.email_confirmed_at IS NULL THEN 'Email non vérifié'
    ELSE 'Actif'
  END AS status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email_confirmed_at IS NOT NULL  -- Seulement les emails vérifiés
ORDER BY au.email;


-- ===== SCRIPT DE RÉINITIALISATION (À ADAPTER) =====
/*
-- Pour envoyer un email de réinitialisation à un utilisateur:
SELECT auth.send_password_reset_email('user@example.com');

-- Pour envoyer à plusieurs utilisateurs (exemple: tous les étudiants d'un département):
DO $$
DECLARE
  user_email TEXT;
BEGIN
  FOR user_email IN 
    SELECT au.email
    FROM auth.users au
    JOIN profiles p ON p.id = au.id
    JOIN user_roles ur ON ur.user_id = au.id
    JOIN departments d ON d.id = p.department_id
    WHERE ur.role = 'student'
      AND d.code = 'GIT'
      AND au.email_confirmed_at IS NOT NULL
  LOOP
    PERFORM auth.send_password_reset_email(user_email);
    RAISE NOTICE 'Email de réinitialisation envoyé à: %', user_email;
  END LOOP;
END $$;
*/
