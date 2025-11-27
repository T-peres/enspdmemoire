# 📁 Scripts SQL - Guide d'Utilisation

## 📋 Liste des Scripts Disponibles

### 1. fix-departments-simple.sql ⭐ EXÉCUTER EN PREMIER
**Objectif** : Corriger le problème de la colonne `department_id` manquante

**Ce qu'il fait** :
- Crée la table `departments` si elle n'existe pas
- Insère les 10 départements de l'ENSPD
- Ajoute la colonne `department_id` à la table `profiles`
- Crée la contrainte de clé étrangère
- Crée l'index

**Quand l'utiliser** :
- ✅ En premier, avant tout autre script
- ✅ Si vous avez l'erreur "la colonne department_id n'existe pas"
- ✅ Si vous avez l'erreur "la table departments n'existe pas"

**Résultat attendu** :
```
✅ 10 départements créés
✅ Colonne department_id ajoutée
```

---

### 2. create-profiles-from-auth.sql ⭐ EXÉCUTER EN DEUXIÈME
**Objectif** : Créer les profils et rôles à partir des utilisateurs Auth existants

⚠️ **PRÉREQUIS** : Les 8 utilisateurs doivent d'abord être créés dans **Authentication > Users**
Voir [CREER_UTILISATEURS_AUTH.md](../CREER_UTILISATEURS_AUTH.md)

**Ce qu'il fait** :
- Crée 8 utilisateurs de test dans la table `profiles`
- Assigne leurs rôles dans `user_roles`
- Assigne leurs départements

**Utilisateurs créés** :
1. `admin@enspd.cm` - Admin
2. `chef.dept@enspd.cm` - Chef de Département (GIT)
3. `encadreur1@enspd.cm` - Encadreur (GIT)
4. `encadreur2@enspd.cm` - Encadreur (GESI)
5. `etudiant1@enspd.cm` - Étudiant (GIT)
6. `etudiant2@enspd.cm` - Étudiant (GESI)
7. `etudiant3@enspd.cm` - Étudiant (GC)
8. `jury1@enspd.cm` - Jury

**⚠️ IMPORTANT** : Après avoir exécuté ce script, vous devez aussi créer ces utilisateurs dans **Supabase Authentication > Users** avec le mot de passe `Test123!`

**Quand l'utiliser** :
- ✅ Après avoir exécuté `fix-departments-simple.sql`
- ✅ Pour créer les comptes de test

**Résultat attendu** :
```
✅ 8 utilisateurs créés
✅ Liste des utilisateurs affichée
```

---

### 3. update-departments.sql (OPTIONNEL)
**Objectif** : Mettre à jour les départements des utilisateurs existants

**Ce qu'il fait** :
- Vérifie que la table `departments` existe
- Assigne des départements aux utilisateurs de test
- Affiche la liste des utilisateurs avec leurs départements

**Quand l'utiliser** :
- ✅ Après avoir exécuté les scripts 1 et 2
- ✅ Si vous voulez réassigner des départements
- ✅ Pour vérifier les départements assignés

**Résultat attendu** :
```
✅ Départements assignés
✅ Liste des utilisateurs avec départements
```

---

### 4. verify-migration.sql (VÉRIFICATION)
**Objectif** : Vérifier que toute la migration s'est bien passée

**Ce qu'il fait** :
- Vérifie les types énumérés (7 attendus)
- Vérifie les tables créées (14 attendues)
- Vérifie les départements (10 attendus)
- Vérifie les fonctions (3 attendues)
- Vérifie les utilisateurs de test (8 attendus)
- Affiche un résumé complet

**Quand l'utiliser** :
- ✅ Après avoir exécuté tous les autres scripts
- ✅ Pour diagnostiquer un problème
- ✅ Pour vérifier que tout est en place

**Résultat attendu** :
```
✅ 7 types énumérés
✅ 14 tables
✅ 10 départements
✅ 3 fonctions
✅ 8 utilisateurs
```

---

## 🔢 Ordre d'Exécution Recommandé

```
1. fix-departments-simple.sql       (OBLIGATOIRE)
   ↓
2. setup-complete-system.sql        (OBLIGATOIRE)
   ↓
2b. Créer les comptes dans Auth     (OBLIGATOIRE)
   ↓
3. update-departments.sql           (OPTIONNEL)
   ↓
4. verify-migration.sql             (VÉRIFICATION)
```

---

## 📖 Comment Exécuter un Script

### Dans Supabase Dashboard

1. Ouvrir https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans **SQL Editor** (menu gauche)
4. Cliquer sur **New Query**
5. Ouvrir le fichier du script dans votre éditeur de code
6. Copier **TOUT** le contenu (Ctrl+A puis Ctrl+C)
7. Coller dans Supabase SQL Editor (Ctrl+V)
8. Cliquer sur **Run** (bouton en bas à droite)
9. Vérifier les résultats

---

## 🚨 Erreurs Courantes

### "la colonne department_id n'existe pas"
**Solution** : Exécuter `fix-departments-simple.sql` en premier

### "la table departments n'existe pas"
**Solution** : Exécuter `fix-departments-simple.sql` en premier

### "type app_role already exists"
**Solution** : Normal si vous avez déjà exécuté une migration. Continuer.

### "duplicate key value violates unique constraint"
**Solution** : L'utilisateur existe déjà. Normal si vous réexécutez le script.

### "relation does not exist"
**Solution** : Vous avez sauté une étape. Recommencer depuis le début.

---

## 📞 Besoin d'Aide ?

Consulter :
- **[INSTALLATION_SIMPLE.md](../INSTALLATION_SIMPLE.md)** - Guide d'installation
- **[DEPANNAGE_MIGRATION.md](../DEPANNAGE_MIGRATION.md)** - Dépannage complet
- **[SOLUTION_RAPIDE.md](../SOLUTION_RAPIDE.md)** - Solution rapide

---

## ✅ Checklist

- [ ] `fix-departments-simple.sql` exécuté
- [ ] `setup-complete-system.sql` exécuté
- [ ] 8 utilisateurs créés dans Authentication
- [ ] `update-departments.sql` exécuté (optionnel)
- [ ] `verify-migration.sql` exécuté (vérification)
- [ ] Tous les résultats sont OK

---

**Bon courage ! 🚀**
