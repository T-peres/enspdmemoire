# 🚫 Guide Anti-Rafraîchissement - React + Vite

## 🎯 Objectif
Empêcher tout rafraîchissement de page lors de l'utilisation des listes déroulantes et formulaires dans l'application React.

## 🔍 Causes Communes de Rafraîchissement

### ❌ **MAUVAISES PRATIQUES**

#### 1. Boutons `type="submit"` sans gestion d'événement
```tsx
// ❌ MAUVAIS - Provoque un rafraîchissement
<Button type="submit" onClick={handleSubmit}>
  Soumettre
</Button>

// ❌ MAUVAIS - Formulaire HTML sans preventDefault
<form onSubmit={handleSubmit}>
  <select onChange={handleChange}>
    <option value="1">Option 1</option>
  </select>
  <button type="submit">Valider</button>
</form>
```

#### 2. Gestion d'événements incorrecte
```tsx
// ❌ MAUVAIS - Pas de preventDefault
const handleSubmit = (data) => {
  // Traitement sans empêcher le comportement par défaut
  processData(data);
};

// ❌ MAUVAIS - Navigation directe
const handleChange = (value) => {
  window.location.href = `/page/${value}`; // Provoque un rafraîchissement
};
```

#### 3. Formulaires HTML implicites
```tsx
// ❌ MAUVAIS - Même sans <form>, les boutons submit peuvent déclencher une soumission
<div>
  <select onChange={handleChange}>...</select>
  <button type="submit">Valider</button> {/* Problématique */}
</div>
```

### ✅ **BONNES PRATIQUES**

#### 1. Utilisation des composants sécurisés
```tsx
// ✅ BON - Utilisation du SafeSelect
import { SafeSelect } from '@/components/ui/SafeSelect';

function MyComponent() {
  const [selectedValue, setSelectedValue] = useState('');
  
  return (
    <SafeSelect
      value={selectedValue}
      onValueChange={setSelectedValue}
      options={[
        { value: '1', label: 'Option 1' },
        { value: '2', label: 'Option 2' },
      ]}
      placeholder="Choisir une option"
    />
  );
}
```

#### 2. Formulaires sécurisés
```tsx
// ✅ BON - Utilisation du SafeForm
import { SafeForm, SafeSubmitButton } from '@/components/ui/SafeForm';

function MyForm() {
  const handleSubmit = async () => {
    // Traitement sécurisé - pas de rafraîchissement
    await processData();
  };

  return (
    <SafeForm onSubmit={handleSubmit}>
      <SafeSelect {...selectProps} />
      <SafeSubmitButton onClick={handleSubmit}>
        Soumettre
      </SafeSubmitButton>
    </SafeForm>
  );
}
```

#### 3. Gestion d'événements correcte
```tsx
// ✅ BON - Avec preventDefault explicite
const handleSubmit = useCallback(async (event?: FormEvent) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  try {
    await processData();
  } catch (error) {
    console.error('Erreur:', error);
  }
}, []);

// ✅ BON - Navigation programmatique avec React Router
const navigate = useNavigate();
const handleChange = (value: string) => {
  navigate(`/page/${value}`); // Pas de rafraîchissement
};
```

## 🛠️ **Migration des Composants Existants**

### Étape 1: Identifier les Composants Problématiques
```bash
# Rechercher les boutons type="submit"
grep -r 'type="submit"' src/

# Rechercher les formulaires HTML
grep -r '<form' src/

# Rechercher les gestionnaires onSubmit
grep -r 'onSubmit' src/
```

### Étape 2: Remplacer par les Composants Sécurisés

#### Avant (Problématique)
```tsx
function OldComponent() {
  const [value, setValue] = useState('');
  
  const handleSubmit = (e) => {
    // Pas de preventDefault - PROBLÈME
    processData(value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <select value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </select>
      <button type="submit">Valider</button>
    </form>
  );
}
```

#### Après (Sécurisé)
```tsx
import { SafeForm, SafeSubmitButton } from '@/components/ui/SafeForm';
import { SafeSelect, useSafeSelect } from '@/components/ui/SafeSelect';

function NewComponent() {
  const select = useSafeSelect('');
  
  const handleSubmit = async () => {
    await processData(select.value);
  };

  const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
  ];

  return (
    <SafeForm onSubmit={handleSubmit}>
      <SafeSelect
        value={select.value}
        onValueChange={select.setValue}
        options={options}
      />
      <SafeSubmitButton onClick={handleSubmit}>
        Valider
      </SafeSubmitButton>
    </SafeForm>
  );
}
```

## 🔧 **Hooks Utilitaires**

### useSafeSelect
```tsx
const select = useSafeSelect('initialValue');

// Propriétés disponibles
select.value        // Valeur actuelle
select.setValue     // Changer la valeur
select.error        // Message d'erreur
select.setError     // Définir une erreur
select.validate     // Valider avec une fonction
select.reset        // Réinitialiser
select.hasValue     // Booléen si une valeur est sélectionnée
```

### useSafeForm
```tsx
const form = useSafeForm({ field1: '', field2: '' });

// Propriétés disponibles
form.values         // Objet avec toutes les valeurs
form.errors         // Objet avec toutes les erreurs
form.loading        // État de chargement
form.setValue       // Changer une valeur
form.setError       // Définir une erreur
form.validate       // Valider tout le formulaire
form.reset          // Réinitialiser tout
form.hasErrors      // Booléen si des erreurs existent
```

## 🚨 **Règles Strictes à Respecter**

### 1. **JAMAIS de `type="submit"`**
```tsx
// ❌ INTERDIT
<Button type="submit">Valider</Button>

// ✅ TOUJOURS utiliser
<Button type="button" onClick={handleClick}>Valider</Button>
// OU
<SafeSubmitButton onClick={handleClick}>Valider</SafeSubmitButton>
```

### 2. **TOUJOURS preventDefault() dans les formulaires**
```tsx
// ✅ OBLIGATOIRE
const handleSubmit = (event: FormEvent) => {
  event.preventDefault();
  event.stopPropagation();
  // Traitement...
};
```

### 3. **Utiliser React Router pour la navigation**
```tsx
// ❌ INTERDIT
window.location.href = '/page';
window.location.reload();

// ✅ CORRECT
const navigate = useNavigate();
navigate('/page');
```

### 4. **Validation des composants Select**
```tsx
// ✅ TOUJOURS vérifier les props
<SafeSelect
  value={value}
  onValueChange={setValue} // Fonction obligatoire
  options={options}        // Array obligatoire
  // ...autres props
/>
```

## 🧪 **Tests de Non-Régression**

### Test Manuel
1. Sélectionner une option dans chaque liste déroulante
2. Vérifier que la page ne se rafraîchit pas
3. Vérifier que l'état React est conservé
4. Tester la soumission des formulaires

### Test Automatisé
```tsx
// Exemple de test avec React Testing Library
import { render, fireEvent, screen } from '@testing-library/react';

test('select change should not refresh page', () => {
  const mockOnChange = jest.fn();
  
  render(
    <SafeSelect
      value=""
      onValueChange={mockOnChange}
      options={[{ value: '1', label: 'Test' }]}
    />
  );
  
  // Simuler un changement
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
  
  // Vérifier que la fonction est appelée
  expect(mockOnChange).toHaveBeenCalledWith('1');
  
  // Vérifier qu'aucun rafraîchissement n'a eu lieu
  expect(window.location.reload).not.toHaveBeenCalled();
});
```

## 📋 **Checklist de Migration**

- [ ] Remplacer tous les `<select>` par `<SafeSelect>`
- [ ] Remplacer tous les `<form>` par `<SafeForm>`
- [ ] Remplacer tous les boutons `type="submit"` par `<SafeSubmitButton>`
- [ ] Ajouter `preventDefault()` dans tous les gestionnaires d'événements
- [ ] Utiliser `useNavigate()` au lieu de `window.location`
- [ ] Tester chaque composant modifié
- [ ] Vérifier les logs de console pour les erreurs
- [ ] Valider l'expérience utilisateur

## 🎯 **Résultat Attendu**

Après application de ces pratiques :
- ✅ Aucun rafraîchissement de page lors des interactions
- ✅ Conservation de l'état React
- ✅ Données chargées préservées
- ✅ Expérience utilisateur fluide
- ✅ Performance optimisée
- ✅ Code maintenable et réutilisable