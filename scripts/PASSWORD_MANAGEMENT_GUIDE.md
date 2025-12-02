# 🔐 Guide de Gestion des Mots de Passe

## ⚠️ INFORMATION IMPORTANTE

**Les mots de passe ne sont PAS stockés en clair dans la base de données !**

Supabase utilise l'algorithme **bcrypt** pour hasher (crypter de manière irréversible) les mots de passe. Cela signifie :
- ❌ Il est **IMPOSSIBLE** de récupérer un mot de passe en clair
- ❌ Il est **IMPOSSIBLE** de "voir" le mot de passe d'un utilisateur
- ✅ C'est une **bonne pratique de sécurité**
- ✅ Conforme aux normes RGPD et sécurité

---

## 🔍 Ce Que Vous POUVEZ Voir

Le script `list-users-with-auth-info.sql` vous permet de voir :

### Informations Disponibles
- ✅ Email de l'utilisateur
- ✅ Statut de vérification de l'email
- ✅ Date de dernière connexion
- ✅ Statut du compte (actif, banni, email non vérifié)
- ✅ Date de création du compte
- ✅ Numéro de téléphone (si renseigné)
- ✅ Activité récente

### Informations NON Disponibles
- ❌ Mot de passe en clair
- ❌ Mot de passe déchiffré
- ❌ Mot de passe hashé (inutile car irréversible)

---

## 🔄 Comment Réinitialiser un Mot de Passe

### Méthode 1 : Via Supabase Dashboard (Recommandé)

1. Connectez-vous à votre projet Supabase
2. Allez dans **Authentication** → **Users**
3. Trouvez l'utilisateur concerné
4. Cliquez sur les **3 points** (⋮) à droite
5. Sélectionnez **"Send password recovery email"**
6. L'utilisateur recevra un email avec un lien de réinitialisation

### Méthode 2 : Via SQL

```sql
-- Envoyer un email de réinitialisation à un utilisateur
SELECT auth.send_password_reset_email('user@example.com');
```

### Méthode 3 : Via l'API Supabase (Frontend)

```typescript
// Dans votre application React
import { supabase } from '@/integrations/supabase/client';

// Envoyer un email de réinitialisation
const { data, error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  {
    redirectTo: 'https://votre-app.com/reset-password',
  }
);
```

### Méthode 4 : Réinitialisation en Masse

```sql
-- Envoyer à tous les étudiants d'un département
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
    RAISE NOTICE 'Email envoyé à: %', user_email;
  END LOOP;
END $$;
```

---

## 🆕 Comment Créer un Compte avec Mot de Passe

### Méthode 1 : Via Supabase Dashboard

1. **Authentication** → **Users** → **Add user**
2. Entrer l'email
3. Entrer un mot de passe temporaire
4. Cocher "Auto Confirm User" (optionnel)
5. Cliquer sur **Create user**

**Note :** L'utilisateur devrait changer ce mot de passe à sa première connexion.

### Méthode 2 : Via l'API Supabase (Inscription)

```typescript
// Inscription d'un nouvel utilisateur
const { data, error } = await supabase.auth.signUp({
  email: 'nouveau@example.com',
  password: 'MotDePasseSecurise123!',
  options: {
    data: {
      first_name: 'Prénom',
      last_name: 'Nom',
    }
  }
});
```

### Méthode 3 : Création en Masse (Script SQL)

```sql
-- ⚠️ Nécessite des privilèges admin
-- Créer plusieurs comptes avec mot de passe par défaut

-- 1. Créer les comptes via Supabase Dashboard ou API
-- 2. Puis ajouter les profils et rôles

INSERT INTO profiles (id, email, first_name, last_name, department_id)
VALUES 
  ('<uuid-from-auth>', 'etudiant1@example.com', 'Prénom1', 'Nom1', '<dept-id>'),
  ('<uuid-from-auth>', 'etudiant2@example.com', 'Prénom2', 'Nom2', '<dept-id>');

INSERT INTO user_roles (user_id, role)
VALUES 
  ('<uuid-from-auth>', 'student'),
  ('<uuid-from-auth>', 'student');
```

---

## 🔒 Politique de Mot de Passe Recommandée

### Exigences Minimales
- ✅ Minimum **8 caractères**
- ✅ Au moins **1 majuscule** (A-Z)
- ✅ Au moins **1 minuscule** (a-z)
- ✅ Au moins **1 chiffre** (0-9)
- ✅ Au moins **1 caractère spécial** (!@#$%^&*)

### Exemples de Mots de Passe Forts
- ✅ `Enspd2024!Secure`
- ✅ `M3m0ir3$Etudiant`
- ✅ `Ch3f_D3pt@2024`
- ❌ `password123` (trop simple)
- ❌ `12345678` (que des chiffres)
- ❌ `azerty` (mot du dictionnaire)

### Configuration dans Supabase

1. Allez dans **Authentication** → **Policies**
2. Configurez les règles de mot de passe :
   - Longueur minimale
   - Complexité requise
   - Expiration (optionnel)

---

## 📊 Vérifier l'État des Comptes

### Script SQL pour Audit

```sql
-- Exécuter le script complet
psql -h <host> -U <user> -d <database> -f scripts/list-users-with-auth-info.sql
```

### Statistiques Importantes

Le script fournit :
- 📊 Total des comptes
- ✅ Emails vérifiés vs non vérifiés
- 🔴 Comptes jamais connectés
- 🟢 Comptes actifs (connectés récemment)
- ⚠️ Comptes inactifs (> 30 jours)
- 🔒 Comptes bannis

---

## 🚨 Cas d'Usage Courants

### 1. Utilisateur a Oublié son Mot de Passe

**Solution :**
```sql
SELECT auth.send_password_reset_email('user@example.com');
```

L'utilisateur recevra un email avec un lien valide 1 heure.

### 2. Créer des Comptes pour Nouveaux Étudiants

**Solution :**
1. Créer les comptes via Supabase Dashboard
2. Utiliser un mot de passe temporaire : `Enspd2024!Temp`
3. Envoyer un email de réinitialisation immédiatement
4. L'étudiant définira son propre mot de passe

### 3. Compte Compromis

**Solution :**
```sql
-- 1. Bannir temporairement le compte
UPDATE auth.users
SET banned_until = NOW() + INTERVAL '24 hours'
WHERE email = 'user@example.com';

-- 2. Envoyer un email de réinitialisation
SELECT auth.send_password_reset_email('user@example.com');

-- 3. Débannir après vérification
UPDATE auth.users
SET banned_until = NULL
WHERE email = 'user@example.com';
```

### 4. Vérifier les Comptes Inactifs

**Solution :**
```sql
-- Lister les comptes jamais connectés depuis 30 jours
SELECT 
  au.email,
  p.first_name || ' ' || p.last_name AS full_name,
  au.created_at
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.last_sign_in_at IS NULL
  AND au.created_at < NOW() - INTERVAL '30 days'
ORDER BY au.created_at;
```

### 5. Forcer la Vérification d'Email

**Solution :**
```sql
-- Renvoyer l'email de confirmation
SELECT auth.send_confirmation_email('user@example.com');
```

---

## 🛡️ Bonnes Pratiques de Sécurité

### Pour les Administrateurs

1. **Ne jamais partager les mots de passe**
   - Toujours utiliser la réinitialisation par email
   - Ne jamais communiquer un mot de passe par téléphone/SMS

2. **Utiliser des mots de passe temporaires forts**
   - Format : `Enspd2024!Temp{Numero}`
   - Forcer le changement à la première connexion

3. **Auditer régulièrement**
   - Vérifier les comptes inactifs
   - Surveiller les tentatives de connexion échouées
   - Désactiver les comptes inutilisés

4. **Politique de rotation**
   - Recommander le changement tous les 90 jours
   - Empêcher la réutilisation des 5 derniers mots de passe

5. **Authentification à deux facteurs (2FA)**
   - Activer pour les comptes administrateurs
   - Recommander pour les encadreurs et chefs de département

### Pour les Utilisateurs

1. **Choisir un mot de passe unique**
   - Ne pas réutiliser un mot de passe d'un autre site
   - Utiliser un gestionnaire de mots de passe

2. **Ne jamais partager son mot de passe**
   - Même avec l'administration
   - Utiliser la réinitialisation si oublié

3. **Se déconnecter après utilisation**
   - Surtout sur ordinateur partagé
   - Utiliser "Se souvenir de moi" uniquement sur appareil personnel

4. **Signaler toute activité suspecte**
   - Connexions non reconnues
   - Emails de réinitialisation non demandés

---

## 📧 Templates d'Emails

### Email de Bienvenue avec Mot de Passe Temporaire

```
Objet : Bienvenue sur la plateforme de gestion des mémoires ENSPD

Bonjour [Prénom] [Nom],

Votre compte a été créé sur la plateforme de gestion des mémoires.

Email : [email]
Mot de passe temporaire : [mot_de_passe_temp]

⚠️ IMPORTANT : Vous devez changer ce mot de passe à votre première connexion.

Pour vous connecter :
1. Allez sur https://votre-app.com
2. Connectez-vous avec vos identifiants
3. Vous serez invité à changer votre mot de passe

Cordialement,
L'équipe ENSPD
```

### Email de Réinitialisation

```
Objet : Réinitialisation de votre mot de passe

Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe.

Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :
[lien_de_reinitialisation]

Ce lien est valide pendant 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

Cordialement,
L'équipe ENSPD
```

---

## 🔧 Dépannage

### Problème : L'utilisateur ne reçoit pas l'email de réinitialisation

**Solutions :**
1. Vérifier les spams/courrier indésirable
2. Vérifier que l'email est correct dans la base
3. Vérifier la configuration SMTP de Supabase
4. Réessayer après quelques minutes

### Problème : Le lien de réinitialisation a expiré

**Solution :**
```sql
-- Renvoyer un nouveau lien
SELECT auth.send_password_reset_email('user@example.com');
```

### Problème : Compte bloqué après plusieurs tentatives

**Solution :**
```sql
-- Débloquer le compte
UPDATE auth.users
SET banned_until = NULL
WHERE email = 'user@example.com';
```

---

## 📚 Ressources

- [Documentation Supabase Auth](https://supabase.com/docs/guides/auth)
- [Bonnes pratiques de sécurité](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [Gestion des utilisateurs](https://supabase.com/docs/guides/auth/managing-user-data)

---

**Date** : 2 décembre 2024  
**Version** : 1.0  
**Important** : Ce guide doit être accessible uniquement aux administrateurs système
