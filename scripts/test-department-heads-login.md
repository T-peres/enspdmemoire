# 🧪 Test de Connexion - Chefs de Département

## 📋 Liste des Comptes à Tester

### 1. GIT - Génie Informatique & Télécommunications
```
Email: chef.git@enspd.cm
Mot de passe: ChefGIT2024!
Couleur attendue: Bleu 🔵
```

**Tests à effectuer :**
- [ ] Connexion réussie
- [ ] Bandeau bleu visible
- [ ] Nom du département affiché : "Génie Informatique & Télécommunications"
- [ ] Code département : GIT
- [ ] 4 onglets visibles
- [ ] Onglet "Attribution Encadreurs" fonctionnel
- [ ] Onglet "Validation Fiches" fonctionnel

---

### 2. GESI - Génie Électrique et Systèmes Intelligents
```
Email: chef.gesi@enspd.cm
Mot de passe: ChefGESI2024!
Couleur attendue: Violet 🟣
```

**Tests à effectuer :**
- [ ] Connexion réussie
- [ ] Bandeau violet visible
- [ ] Nom du département affiché
- [ ] Filtrage par département GESI

---

### 3. GQHSE - Génie de la Qualité Hygiène Sécurité et Environnement
```
Email: chef.gqhse@enspd.cm
Mot de passe: ChefGQHSE2024!
Couleur attendue: Vert 🟢
```

**Tests à effectuer :**
- [ ] Connexion réussie
- [ ] Bandeau vert visible
- [ ] Nom du département affiché
- [ ] Filtrage par département GQHSE

---

### 4. GAM - Génie Automobile et Mécatronique
```
Email: chef.gam@enspd.cm
Mot de passe: ChefGAM2024!
Couleur attendue: Orange 🟠
```

**Tests à effectuer :**
- [ ] Connexion réussie
- [ ] Bandeau orange visible
- [ ] Nom du département affiché
- [ ] Filtrage par département GAM

---

### 5. GMP - Génie Maritime et Portuaire
```
Email: chef.gmp@enspd.cm
Mot de passe: ChefGMP2024!
Couleur attendue: Cyan 🔷
```

**Tests à effectuer :**
- [ ] Connexion réussie
- [ ] Bandeau cyan visible
- [ ] Nom du département affiché
- [ ] Filtrage par département GMP

---

### 6. GP - Génie des Procédés
```
Email: chef.gp@enspd.cm
Mot de passe: ChefGP2024!
Couleur attendue: Indigo 🔵
```

**Tests à effectuer :**
- [ ] Connexion réussie
- [ ] Bandeau indigo visible
- [ ] Nom du département affiché
- [ ] Filtrage par département GP

---

### 7. GE - Génie Énergétique
```
Email: chef.ge@enspd.cm
Mot de passe: ChefGE2024!
Couleur attendue: Jaune 🟡
```

**Tests à effectuer :**
- [ ] Connexion réussie
- [ ] Bandeau jaune visible
- [ ] Nom du département affiché
- [ ] Filtrage par département GE

---

### 8. GM - Génie Mécanique
```
Email: chef.gm@enspd.cm
Mot de passe: ChefGM2024!
Couleur attendue: Rouge 🔴
```

**Tests à effectuer :**
- [ ] Connexion réussie
- [ ] Bandeau rouge visible
- [ ] Nom du département affiché
- [ ] Filtrage par département GM

---

### 9. GPH - Génie Physique
```
Email: chef.gph@enspd.cm
Mot de passe: ChefGPH2024!
Couleur attendue: Rose 🌸
```

**Tests à effectuer :**
- [ ] Connexion réussie
- [ ] Bandeau rose visible
- [ ] Nom du département affiché
- [ ] Filtrage par département GPH

---

### 10. GC - Génie Civil
```
Email: chef.gc@enspd.cm
Mot de passe: ChefGC2024!
Couleur attendue: Teal 🔷
```

**Tests à effectuer :**
- [ ] Connexion réussie
- [ ] Bandeau teal visible
- [ ] Nom du département affiché
- [ ] Filtrage par département GC

---

## 🔍 Tests Fonctionnels Détaillés

### Test 1 : Connexion
1. Aller sur `/auth`
2. Entrer l'email du chef
3. Entrer le mot de passe
4. Cliquer sur "Se connecter"
5. ✅ Redirection vers `/department-dashboard`

### Test 2 : Bandeau Personnalisé
1. Vérifier la couleur du bandeau
2. Vérifier l'icône du département (Building2)
3. Vérifier le nom complet du département
4. Vérifier le code du département
5. Vérifier le nom du chef affiché

### Test 3 : Onglet "Sujets de Thèse"
1. Cliquer sur l'onglet "Sujets de Thèse"
2. Vérifier les statistiques (4 cartes)
3. Vérifier le graphique de répartition
4. Vérifier la liste des sujets

### Test 4 : Onglet "Attribution Encadreurs"
1. Cliquer sur l'onglet "Attribution Encadreurs"
2. Vérifier le formulaire d'attribution
3. Vérifier que seuls les étudiants du département sont listés
4. Vérifier que seuls les encadreurs du département sont listés
5. Tester une attribution

### Test 5 : Onglet "Encadreurs"
1. Cliquer sur l'onglet "Encadreurs"
2. Vérifier la liste des encadreurs
3. Vérifier les statistiques par encadreur
4. Vérifier les badges de disponibilité

### Test 6 : Onglet "Validation Fiches"
1. Cliquer sur l'onglet "Validation Fiches"
2. Vérifier la liste des fiches en attente
3. Tester l'ajout de commentaires
4. Tester la validation d'une fiche

### Test 7 : Filtrage par Département
1. Se connecter avec chef.git@enspd.cm
2. Noter les étudiants/encadreurs visibles
3. Se déconnecter
4. Se connecter avec chef.gesi@enspd.cm
5. Vérifier que les données sont différentes
6. ✅ Chaque chef ne voit que son département

---

## 📊 Checklist Globale

### Pré-requis
- [ ] Script SQL `create-department-heads.sql` exécuté
- [ ] Script de vérification `verify-department-heads.sql` exécuté
- [ ] Aucun problème détecté dans la vérification
- [ ] Application démarrée (`npm run dev`)

### Tests de Base (pour chaque compte)
- [ ] Connexion réussie
- [ ] Bandeau personnalisé visible
- [ ] Nom et code département corrects
- [ ] 4 onglets présents
- [ ] Déconnexion réussie

### Tests Fonctionnels (au moins 2 comptes)
- [ ] Attribution d'un encadreur
- [ ] Validation d'une fiche de suivi
- [ ] Approbation d'un sujet
- [ ] Consultation des statistiques

### Tests de Sécurité
- [ ] Un chef ne voit que son département
- [ ] Impossible d'attribuer un encadreur d'un autre département
- [ ] Impossible de valider une fiche d'un autre département

---

## 🐛 Problèmes Courants

### Problème : "Accès Refusé"
**Solution :**
```sql
-- Vérifier le rôle
SELECT * FROM user_roles WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'chef.xxx@enspd.cm'
);

-- Ajouter le rôle si manquant
INSERT INTO user_roles (user_id, role)
SELECT id, 'department_head'::app_role
FROM profiles
WHERE email = 'chef.xxx@enspd.cm';
```

### Problème : Bandeau ne s'affiche pas
**Solution :**
```sql
-- Vérifier le département assigné
SELECT email, department_id FROM profiles 
WHERE email = 'chef.xxx@enspd.cm';

-- Assigner le département si manquant
UPDATE profiles
SET department_id = (SELECT id FROM departments WHERE code = 'XXX')
WHERE email = 'chef.xxx@enspd.cm';
```

### Problème : Aucun étudiant/encadreur visible
**Solution :**
```sql
-- Créer des utilisateurs de test pour le département
-- Voir: scripts/create-test-users.sql
```

---

## ✅ Résultat Attendu

Après tous les tests :
- ✅ 10 comptes fonctionnels
- ✅ 10 bandeaux personnalisés
- ✅ Filtrage par département opérationnel
- ✅ Attribution des encadreurs fonctionnelle
- ✅ Validation des fiches fonctionnelle
- ✅ Aucune erreur console
- ✅ Interface responsive

---

## 📝 Rapport de Test

### Date : _______________
### Testeur : _______________

| Département | Connexion | Bandeau | Attribution | Validation | Notes |
|-------------|-----------|---------|-------------|------------|-------|
| GIT         | ⬜        | ⬜      | ⬜          | ⬜         |       |
| GESI        | ⬜        | ⬜      | ⬜          | ⬜         |       |
| GQHSE       | ⬜        | ⬜      | ⬜          | ⬜         |       |
| GAM         | ⬜        | ⬜      | ⬜          | ⬜         |       |
| GMP         | ⬜        | ⬜      | ⬜          | ⬜         |       |
| GP          | ⬜        | ⬜      | ⬜          | ⬜         |       |
| GE          | ⬜        | ⬜      | ⬜          | ⬜         |       |
| GM          | ⬜        | ⬜      | ⬜          | ⬜         |       |
| GPH         | ⬜        | ⬜      | ⬜          | ⬜         |       |
| GC          | ⬜        | ⬜      | ⬜          | ⬜         |       |

**Légende :** ✅ = Réussi | ❌ = Échoué | ⚠️ = Partiel | ⬜ = Non testé
