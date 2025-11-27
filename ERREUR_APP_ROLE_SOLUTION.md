# ⚠️ ERREUR: Column "role" is of type app_role

## 🔴 Message d'Erreur Complet
```
ERROR: 42804: column "role" is of type app_role but expression is of type text
LINE 66: SELECT DISTINCT p.id, 'supervisor'
HINT: You will need to rewrite or cast the expression.
```

---

## 🎯 CAUSE

La colonne `role` dans la table `user_roles` est de type **`app_role`** (un ENUM PostgreSQL), pas un simple `text`.

### Définition du Type
```sql
CREATE TYPE app_role AS ENUM (
  'student', 
  'supervisor', 
  'department_head', 
  'jury', 
  'admin'
);
```

---

## ✅ SOLUTION

Il faut **caster** la valeur texte en type `app_role` avec `::app_role`

### ❌ INCORRECT
```sql
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'supervisor'  -- ← ERREUR: type text
FROM profiles p
WHERE p.email = 'encadreur@enspd.cm';
```

### ✅ CORRECT
```sql
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'supervisor'::app_role  -- ← CORRECT: cast en app_role
FROM profiles p
WHERE p.email = 'encadreur@enspd.cm';
```

---

## 🔧 CORRECTIONS APPLIQUÉES

Tous les scripts ont été corrigés avec le cast `::app_role` :

### 1. scripts/fix-supervisor-roles.sql ✅
```sql
INSERT INTO user_roles (user_id, role)
SELECT DISTINCT p.id, 'supervisor'::app_role  -- ← Corrigé
FROM profiles p
...
```

### 2. scripts/quick-fix-supervisors.sql ✅
```sql
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'supervisor'::app_role  -- ← Corrigé
FROM profiles p
...
```

### 3. scripts/add-supervisors-NOW.sql ✅
Nouveau script avec la syntaxe correcte dès le départ

### 4. SOLUTION_PROBLEME_ENCADREURS.md ✅
Documentation mise à jour avec les bons exemples

### 5. FIX_ENCADREURS_RAPIDE.md ✅
Guide rapide corrigé

---

## 🚀 COMMANDE CORRECTE À EXÉCUTER

### Option 1: Par Email (Recommandé)
```sql
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'supervisor'::app_role
FROM profiles p
WHERE p.email IN (
  'encadreur1@enspd.cm',
  'encadreur2@enspd.cm',
  'prof.dupont@enspd.cm'
)
ON CONFLICT (user_id, role) DO NOTHING;
```

### Option 2: Par ID
```sql
INSERT INTO user_roles (user_id, role)
VALUES 
  ('uuid-encadreur-1', 'supervisor'::app_role),
  ('uuid-encadreur-2', 'supervisor'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;
```

### Option 3: Créer un Encadreur de Test
```sql
DO $$
DECLARE
  dept_id UUID;
  user_id UUID;
BEGIN
  -- Récupérer le département GIT
  SELECT id INTO dept_id FROM departments WHERE code = 'GIT';
  
  -- Créer le profil
  INSERT INTO profiles (id, email, first_name, last_name, department_id)
  VALUES (
    gen_random_uuid(),
    'encadreur.git@enspd.cm',
    'Jean',
    'Dupont',
    dept_id
  )
  RETURNING id INTO user_id;
  
  -- Ajouter le rôle avec le cast
  INSERT INTO user_roles (user_id, role) 
  VALUES (user_id, 'supervisor'::app_role);
  
  RAISE NOTICE 'Encadreur créé avec succès!';
END $$;
```

---

## 📋 VALEURS POSSIBLES POUR app_role

```sql
-- Valeurs valides pour le type app_role:
'student'::app_role
'supervisor'::app_role
'department_head'::app_role
'jury'::app_role
'admin'::app_role
```

---

## 🧪 VÉRIFICATION

Après avoir exécuté la commande correcte:

```sql
-- Compter les encadreurs
SELECT COUNT(*) as total_supervisors 
FROM user_roles 
WHERE role = 'supervisor';

-- Lister les encadreurs
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  d.code as department
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE ur.role = 'supervisor'
ORDER BY d.code, p.last_name;
```

---

## 📚 SCRIPTS DISPONIBLES

### Script Immédiat (Nouveau)
**`scripts/add-supervisors-NOW.sql`**
- Syntaxe correcte dès le départ
- 3 méthodes au choix
- Vérifications incluses

### Scripts Corrigés
- ✅ `scripts/fix-supervisor-roles.sql`
- ✅ `scripts/quick-fix-supervisors.sql`
- ✅ `SOLUTION_PROBLEME_ENCADREURS.md`
- ✅ `FIX_ENCADREURS_RAPIDE.md`

---

## 💡 ASTUCE

Pour éviter cette erreur à l'avenir, **toujours caster** les valeurs ENUM:

```sql
-- Pour tous les rôles
INSERT INTO user_roles (user_id, role) VALUES
  (user_id, 'student'::app_role),
  (user_id, 'supervisor'::app_role),
  (user_id, 'department_head'::app_role);
```

---

## 🎯 PROCHAINE ÉTAPE

1. **Exécutez** le script `scripts/add-supervisors-NOW.sql`
2. **Choisissez** une des 3 méthodes (décommentez celle que vous voulez)
3. **Vérifiez** avec les requêtes de vérification
4. **Rafraîchissez** l'interface (F5)

Les encadreurs devraient maintenant apparaître dans la liste déroulante !

---

**Document créé le:** 27 Novembre 2025  
**Erreur résolue:** ✅ Tous les scripts corrigés  
**Statut:** Prêt à utiliser
