# 📋 Scripts de Gestion des Utilisateurs

## 📁 Fichiers Disponibles

### 1. `list-all-users-with-roles.sql` - Script Complet
**Description :** Script détaillé avec toutes les informations sur les utilisateurs et leurs rôles.

**Sections incluses :**
- ✅ Liste complète des utilisateurs avec rôles
- 📊 Statistiques par rôle
- 👥 Utilisateurs avec plusieurs rôles
- 🎓 Liste des étudiants (avec encadreur et thème)
- 👨‍🏫 Liste des encadreurs (avec nombre d'étudiants)
- 🏛️ Liste des chefs de département
- ⚖️ Liste des membres du jury
- 👑 Liste des administrateurs
- ⚠️ Utilisateurs sans rôle
- 📈 Résumé global
- 🏢 Répartition par département
- 🕐 Activité récente (30 derniers jours)

**Utilisation :**
```bash
# Via psql
psql -h <host> -U <user> -d <database> -f scripts/list-all-users-with-roles.sql

# Via Supabase Dashboard
# Copier-coller le contenu dans SQL Editor et exécuter
```

---

### 2. `quick-users-list.sql` - Liste Rapide
**Description :** Affichage simple et rapide avec emojis pour meilleure lisibilité.

**Emojis utilisés :**
- 🎓 = Étudiant
- 👨‍🏫 = Encadreur
- 🏛️ = Chef de département
- ⚖️ = Membre du jury
- 👑 = Administrateur

**Utilisation :**
```bash
psql -h <host> -U <user> -d <database> -f scripts/quick-users-list.sql
```

---

### 3. `export-users-csv.sql` - Export CSV
**Description :** Prépare les données pour export en format CSV/Excel.

**Formats d'export :**
- Export complet (tous les utilisateurs)
- Export par rôle (étudiants, encadreurs, etc.)
- Export pour import dans autre système

**Utilisation :**

#### Méthode 1 - Via psql (ligne de commande)
```bash
# Export complet
psql -h <host> -U <user> -d <database> -c "\copy (SELECT ... FROM ...) TO '/chemin/vers/fichier.csv' WITH CSV HEADER DELIMITER ';' ENCODING 'UTF8';"

# Ou utiliser le script directement
psql -h <host> -U <user> -d <database> -f scripts/export-users-csv.sql > users.csv
```

#### Méthode 2 - Via pgAdmin
1. Ouvrir pgAdmin
2. Exécuter la requête du script
3. Clic droit sur les résultats
4. "Export" → "CSV"
5. Choisir le délimiteur (`;`) et l'encodage (`UTF-8`)

#### Méthode 3 - Via Supabase Dashboard
1. Aller dans SQL Editor
2. Copier-coller la requête
3. Exécuter
4. Cliquer sur "Download CSV"

#### Méthode 4 - Copier-coller dans Excel
1. Exécuter la requête
2. Sélectionner tous les résultats
3. Copier (Ctrl+C)
4. Coller dans Excel (Ctrl+V)
5. Utiliser "Données" → "Convertir" pour séparer les colonnes

---

## 🔍 Exemples de Requêtes

### Rechercher un utilisateur par email
```sql
SELECT 
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  string_agg(ur.role::text, ', ') AS roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email ILIKE '%john.doe@example.com%'
GROUP BY p.id, p.email, p.first_name, p.last_name;
```

### Lister les utilisateurs d'un département
```sql
SELECT 
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  string_agg(ur.role::text, ', ') AS roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN departments d ON d.id = p.department_id
WHERE d.code = 'GIT'  -- Modifier le code département
GROUP BY p.id, p.email, p.first_name, p.last_name;
```

### Compter les utilisateurs par rôle
```sql
SELECT 
  role,
  COUNT(DISTINCT user_id) AS count
FROM user_roles
GROUP BY role
ORDER BY count DESC;
```

### Trouver les utilisateurs avec plusieurs rôles
```sql
SELECT 
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  string_agg(ur.role::text, ', ') AS roles,
  COUNT(ur.role) AS roles_count
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.email, p.first_name, p.last_name
HAVING COUNT(ur.role) > 1
ORDER BY COUNT(ur.role) DESC;
```

### Lister les étudiants sans encadreur
```sql
SELECT 
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  p.student_id,
  d.code AS department
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'student'
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN supervisor_assignments sa ON sa.student_id = p.id AND sa.is_active = TRUE
WHERE sa.id IS NULL
ORDER BY d.code, p.last_name;
```

### Lister les encadreurs avec leur charge
```sql
SELECT 
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  d.code AS department,
  COUNT(sa.student_id) AS students_count,
  CASE 
    WHEN COUNT(sa.student_id) > 5 THEN '⚠️ Surchargé'
    WHEN COUNT(sa.student_id) = 0 THEN '✅ Disponible'
    ELSE '✓ Normal'
  END AS status
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'supervisor'
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN supervisor_assignments sa ON sa.supervisor_id = p.id AND sa.is_active = TRUE
GROUP BY p.id, p.email, p.first_name, p.last_name, d.code
ORDER BY COUNT(sa.student_id) DESC;
```

---

## 📊 Statistiques Utiles

### Résumé global
```sql
SELECT 
  'Total utilisateurs' AS metric,
  COUNT(*) AS count
FROM profiles
UNION ALL
SELECT 
  'Étudiants',
  COUNT(DISTINCT user_id)
FROM user_roles WHERE role = 'student'
UNION ALL
SELECT 
  'Encadreurs',
  COUNT(DISTINCT user_id)
FROM user_roles WHERE role = 'supervisor'
UNION ALL
SELECT 
  'Chefs de département',
  COUNT(DISTINCT user_id)
FROM user_roles WHERE role = 'department_head'
UNION ALL
SELECT 
  'Membres du jury',
  COUNT(DISTINCT user_id)
FROM user_roles WHERE role = 'jury'
UNION ALL
SELECT 
  'Administrateurs',
  COUNT(DISTINCT user_id)
FROM user_roles WHERE role = 'admin';
```

### Répartition par département
```sql
SELECT 
  d.code,
  d.name,
  COUNT(DISTINCT CASE WHEN ur.role = 'student' THEN p.id END) AS students,
  COUNT(DISTINCT CASE WHEN ur.role = 'supervisor' THEN p.id END) AS supervisors,
  COUNT(DISTINCT p.id) AS total
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY d.id, d.code, d.name
ORDER BY d.code;
```

---

## 🔐 Sécurité

### Vérifier les utilisateurs sans rôle
```sql
SELECT 
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.id IS NULL
ORDER BY p.created_at DESC;
```

### Vérifier les administrateurs
```sql
SELECT 
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  ur.assigned_at AS admin_since
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
ORDER BY ur.assigned_at;
```

---

## 📝 Notes Importantes

### Rôles Disponibles
- `student` : Étudiant
- `supervisor` : Encadreur
- `department_head` : Chef de département
- `jury` : Membre du jury
- `admin` : Administrateur système

### Multi-rôles
Un utilisateur peut avoir plusieurs rôles simultanément. Par exemple :
- Un encadreur peut aussi être membre du jury
- Un chef de département peut aussi être encadreur
- Un administrateur peut avoir tous les rôles

### Départements ENSPD
- **GIT** : Génie Informatique & Télécommunications
- **GESI** : Génie Électrique et Systèmes Intelligents
- **GQHSE** : Génie de la Qualité Hygiène Sécurité et Environnement
- **GAM** : Génie Automobile et Mécatronique
- **GMP** : Génie Maritime et Portuaire
- **GP** : Génie des Procédés
- **GE** : Génie Énergétique
- **GM** : Génie Mécanique
- **GPH** : Génie Physique
- **GC** : Génie Civil

---

## 🚀 Utilisation Rapide

### Commande unique pour tout voir
```bash
# Exécuter le script complet
psql -h <host> -U <user> -d <database> -f scripts/list-all-users-with-roles.sql

# Ou via Supabase
# Copier le contenu de list-all-users-with-roles.sql dans SQL Editor
```

### Export rapide en CSV
```bash
# Export de tous les utilisateurs
psql -h <host> -U <user> -d <database> -f scripts/export-users-csv.sql > users.csv
```

---

## 📞 Support

Pour toute question sur l'utilisation de ces scripts, consultez :
- La documentation Supabase : https://supabase.com/docs
- La documentation PostgreSQL : https://www.postgresql.org/docs/

---

**Date de création** : 2 décembre 2024  
**Version** : 1.0  
**Auteur** : Système de Gestion des Mémoires ENSPD
