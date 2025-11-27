# ⚡ FIX RAPIDE: Encadreurs Manquants

## 🎯 Problème
La liste déroulante "Encadreur" est vide dans le formulaire d'attribution.

## ✅ Solution en 3 Étapes

### 1. Identifier vos encadreurs
```sql
SELECT email, first_name, last_name 
FROM profiles 
ORDER BY last_name;
```

### 2. Ajouter le rôle "supervisor"
```sql
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'supervisor'::app_role
FROM profiles p
WHERE p.email IN (
  'encadreur1@enspd.cm',  -- ← Remplacez par vos emails
  'encadreur2@enspd.cm',
  'prof.dupont@enspd.cm'
)
ON CONFLICT (user_id, role) DO NOTHING;
```

### 3. Vérifier
```sql
SELECT COUNT(*) FROM user_roles WHERE role = 'supervisor';
-- Doit être > 0
```

## 🔄 Rafraîchir l'Interface
Appuyez sur **F5** dans votre navigateur.

---

## 📋 Alternative: Créer des Encadreurs de Test

```sql
-- Pour le département GIT
DO $$
DECLARE
  dept_id UUID;
  user_id UUID;
BEGIN
  SELECT id INTO dept_id FROM departments WHERE code = 'GIT';
  
  INSERT INTO profiles (id, email, first_name, last_name, department_id)
  VALUES (gen_random_uuid(), 'encadreur.git@enspd.cm', 'Jean', 'Dupont', dept_id)
  RETURNING id INTO user_id;
  
  INSERT INTO user_roles (user_id, role) VALUES (user_id, 'supervisor'::app_role);
END $$;
```

---

## 📞 Besoin d'Aide ?
Consultez: `SOLUTION_PROBLEME_ENCADREURS.md` pour plus de détails.

**Scripts disponibles:**
- `scripts/quick-fix-supervisors.sql` - Correction guidée
- `scripts/fix-supervisor-roles.sql` - Correction complète
