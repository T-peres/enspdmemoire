# 🔧 SOLUTION: Problème "Aucun encadreur disponible"

**Date:** 27 Novembre 2025  
**Problème:** Le formulaire d'attribution d'encadreur affiche "Sélectionner un encadreur" mais la liste est vide

---

## 🎯 DIAGNOSTIC

### Cause du Problème
Le formulaire `SupervisorAssignmentForm` charge correctement les données, mais **aucun utilisateur n'a le rôle "supervisor"** dans la table `user_roles`.

### Vérification
```sql
-- Vérifier combien d'encadreurs existent
SELECT COUNT(*) FROM user_roles WHERE role = 'supervisor';
-- Si le résultat est 0, c'est le problème!
```

---

## ✅ SOLUTION RAPIDE (5 minutes)

### Étape 1: Identifier vos encadreurs
Listez tous les utilisateurs pour identifier qui devrait être encadreur:

```sql
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  d.code as department,
  STRING_AGG(ur.role::text, ', ') as current_roles
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.email, p.first_name, p.last_name, d.code
ORDER BY d.code, p.last_name;
```

### Étape 2: Ajouter le rôle "supervisor"

**Option A: Par email (RECOMMANDÉ)**
```sql
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'supervisor'::app_role
FROM profiles p
WHERE p.email IN (
  'encadreur1@enspd.cm',
  'encadreur2@enspd.cm',
  'prof.dupont@enspd.cm'
  -- Ajoutez les emails de vos encadreurs ici
)
ON CONFLICT (user_id, role) DO NOTHING;
```

**Option B: Automatique (tous les non-étudiants)**
```sql
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'supervisor'::app_role
FROM profiles p
WHERE p.id NOT IN (
  SELECT user_id FROM user_roles 
  WHERE role IN ('student', 'admin', 'department_head')
)
ON CONFLICT (user_id, role) DO NOTHING;
```

### Étape 3: Vérifier
```sql
-- Compter les encadreurs
SELECT COUNT(*) as total_supervisors 
FROM user_roles 
WHERE role = 'supervisor';

-- Lister les encadreurs par département
SELECT 
  d.code as dept,
  p.first_name,
  p.last_name,
  p.email
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE ur.role = 'supervisor'
ORDER BY d.code, p.last_name;
```

### Étape 4: Rafraîchir l'interface
1. Retournez dans l'interface web
2. Rafraîchissez la page (F5)
3. Les encadreurs devraient maintenant apparaître dans la liste déroulante

---

## 📋 SCRIPTS DISPONIBLES

### Script Complet
**Fichier:** `scripts/fix-supervisor-roles.sql`
- Diagnostic détaillé
- Plusieurs options de correction
- Vérifications complètes
- Création d'encadreurs de test

### Script Rapide
**Fichier:** `scripts/quick-fix-supervisors.sql`
- Correction en 5 étapes
- Plus simple et direct
- Idéal pour une correction rapide

---

## 🔍 DIAGNOSTIC APPROFONDI

### Vérifier la structure complète
```sql
-- Statistiques par rôle
SELECT 
  role,
  COUNT(*) as count
FROM user_roles
GROUP BY role
ORDER BY role;

-- Statistiques par département
SELECT 
  d.code as department,
  d.name,
  COUNT(DISTINCT CASE WHEN ur.role = 'student' THEN p.id END) as students,
  COUNT(DISTINCT CASE WHEN ur.role = 'supervisor' THEN p.id END) as supervisors,
  COUNT(DISTINCT CASE WHEN ur.role = 'department_head' THEN p.id END) as dept_heads
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY d.id, d.code, d.name
ORDER BY d.code;
```

---

## 🎨 EXEMPLE COMPLET

### Scénario: Département GIT avec 2 encadreurs

```sql
-- 1. Vérifier les utilisateurs du département GIT
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  STRING_AGG(ur.role::text, ', ') as roles
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE d.code = 'GIT'
GROUP BY p.id, p.email, p.first_name, p.last_name
ORDER BY p.last_name;

-- 2. Ajouter le rôle supervisor aux encadreurs
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'supervisor'::app_role
FROM profiles p
JOIN departments d ON d.id = p.department_id
WHERE d.code = 'GIT'
  AND p.email IN (
    'prof.kamga@enspd.cm',
    'dr.nguema@enspd.cm'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Vérifier le résultat
SELECT 
  p.first_name,
  p.last_name,
  p.email,
  STRING_AGG(ur.role::text, ', ') as roles
FROM profiles p
JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE d.code = 'GIT'
GROUP BY p.id, p.first_name, p.last_name, p.email
ORDER BY p.last_name;
```

---

## 🚀 CRÉATION D'ENCADREURS DE TEST

Si vous n'avez pas encore d'encadreurs, créez-en pour tester:

```sql
-- Créer 2 encadreurs de test pour le département GIT
DO $$
DECLARE
  dept_id UUID;
  user1_id UUID;
  user2_id UUID;
BEGIN
  -- Récupérer l'ID du département GIT
  SELECT id INTO dept_id FROM departments WHERE code = 'GIT';
  
  -- Créer encadreur 1
  INSERT INTO profiles (id, email, first_name, last_name, department_id)
  VALUES (
    gen_random_uuid(),
    'encadreur1.git@enspd.cm',
    'Jean',
    'Dupont',
    dept_id
  )
  RETURNING id INTO user1_id;
  
  INSERT INTO user_roles (user_id, role)
  VALUES (user1_id, 'supervisor'::app_role);
  
  -- Créer encadreur 2
  INSERT INTO profiles (id, email, first_name, last_name, department_id)
  VALUES (
    gen_random_uuid(),
    'encadreur2.git@enspd.cm',
    'Marie',
    'Martin',
    dept_id
  )
  RETURNING id INTO user2_id;
  
  INSERT INTO user_roles (user_id, role)
  VALUES (user2_id, 'supervisor'::app_role);
  
  RAISE NOTICE 'Encadreurs créés avec succès!';
END $$;
```

---

## ⚠️ POINTS D'ATTENTION

### 1. Département Obligatoire
Assurez-vous que tous les encadreurs ont un `department_id`:
```sql
-- Vérifier les encadreurs sans département
SELECT 
  p.email,
  p.first_name,
  p.last_name
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'supervisor'
  AND p.department_id IS NULL;

-- Corriger si nécessaire
UPDATE profiles
SET department_id = (SELECT id FROM departments WHERE code = 'GIT')
WHERE email = 'encadreur@enspd.cm';
```

### 2. Rôles Multiples
Un utilisateur peut avoir plusieurs rôles:
```sql
-- Un encadreur peut aussi être chef de département
INSERT INTO user_roles (user_id, role)
VALUES 
  ('user-uuid', 'supervisor'::app_role),
  ('user-uuid', 'department_head'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;
```

### 3. Politiques RLS
Les politiques RLS filtrent automatiquement par département. Vérifiez que l'encadreur et l'étudiant sont du même département.

---

## 🧪 TESTS DE VALIDATION

### Test 1: Compter les encadreurs
```sql
SELECT COUNT(*) as total FROM user_roles WHERE role = 'supervisor';
-- Résultat attendu: > 0
```

### Test 2: Encadreurs par département
```sql
SELECT 
  d.code,
  COUNT(*) as supervisors
FROM departments d
JOIN profiles p ON p.department_id = d.id
JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'supervisor'
GROUP BY d.code
ORDER BY d.code;
-- Résultat attendu: Au moins 1 encadreur par département
```

### Test 3: Interface Web
1. Connectez-vous en tant que Chef de Département
2. Allez dans "Attributions"
3. Cliquez sur "Encadreur *"
4. Vérifiez que la liste contient des encadreurs

---

## 📞 DÉPANNAGE

### Problème: Les encadreurs n'apparaissent toujours pas

**Solution 1: Vider le cache du navigateur**
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

**Solution 2: Vérifier les logs de la console**
```javascript
// Ouvrir la console du navigateur (F12)
// Chercher les messages de debug:
// 🔍 DEBUG - Supervisor roles: [...]
// 🔍 DEBUG - Supervisors data: [...]
```

**Solution 3: Vérifier les politiques RLS**
```sql
-- Désactiver temporairement RLS pour tester
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Tester l'interface

-- Réactiver RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

---

## ✅ CHECKLIST DE RÉSOLUTION

- [ ] Exécuter le diagnostic (compter les encadreurs)
- [ ] Identifier les utilisateurs qui doivent être encadreurs
- [ ] Ajouter le rôle "supervisor" aux utilisateurs appropriés
- [ ] Vérifier que les encadreurs ont un department_id
- [ ] Vérifier que les encadreurs sont du même département que les étudiants
- [ ] Rafraîchir l'interface web
- [ ] Tester l'attribution d'un encadreur à un étudiant
- [ ] Vérifier que l'attribution est enregistrée dans supervisor_assignments

---

## 🎯 RÉSULTAT ATTENDU

Après correction, vous devriez voir:

```
Encadreur *
┌─────────────────────────────────────┐
│ Sélectionner un encadreur          │
├─────────────────────────────────────┤
│ Jean Dupont                         │
│ Marie Martin                        │
│ Pierre Kamga                        │
│ ...                                 │
└─────────────────────────────────────┘
```

---

## 📚 RESSOURCES

- **Script complet:** `scripts/fix-supervisor-roles.sql`
- **Script rapide:** `scripts/quick-fix-supervisors.sql`
- **Composant:** `src/components/department/SupervisorAssignmentForm.tsx`
- **Documentation:** `AUDIT_COHERENCE_INTERFACES.md`

---

**Document créé le:** 27 Novembre 2025  
**Statut:** ✅ Solution Complète  
**Temps de résolution estimé:** 5-10 minutes
