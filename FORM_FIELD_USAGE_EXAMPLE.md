# Guide d'Utilisation du Composant FormField

## Introduction

Le composant `FormField` a été créé pour garantir que tous les champs de formulaire respectent les standards d'accessibilité et incluent automatiquement les attributs `id`, `name`, et les aria-attributes nécessaires.

## Import

```tsx
import { FormField, TextareaField } from '@/components/ui/form-field';
```

## Utilisation Basique

### Input Simple

```tsx
<FormField
  id="user-email"
  label="Email"
  type="email"
  placeholder="votre.email@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  autoComplete="email"
/>
```

### Input Requis avec Texte d'Aide

```tsx
<FormField
  id="user-password"
  label="Mot de passe"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  required
  helperText="Minimum 6 caractères"
  autoComplete="new-password"
/>
```

### Input avec Erreur

```tsx
<FormField
  id="user-matricule"
  label="Matricule"
  value={matricule}
  onChange={(e) => setMatricule(e.target.value)}
  required
  error={errors.matricule}
  helperText="Format: 20XX-XXXX"
/>
```

### Textarea

```tsx
<TextareaField
  id="description"
  label="Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={4}
  helperText="Décrivez votre projet en quelques lignes"
  maxLength={500}
/>
```

## Exemple Complet de Formulaire

```tsx
import { useState } from 'react';
import { FormField, TextareaField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Le message est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Votre logique de soumission ici
      console.log('Form submitted:', formData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formulaire de Contact</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="contact-name"
            label="Nom complet"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
            autoComplete="name"
          />

          <FormField
            id="contact-email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
            autoComplete="email"
            placeholder="votre.email@example.com"
          />

          <FormField
            id="contact-subject"
            label="Sujet"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            helperText="Optionnel"
            autoComplete="off"
          />

          <TextareaField
            id="contact-message"
            label="Message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            error={errors.message}
            required
            rows={5}
            helperText="Décrivez votre demande en détail"
          />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Envoi en cours...' : 'Envoyer'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

## Props du Composant

### FormField Props

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `id` | string | ✅ | Identifiant unique du champ |
| `label` | string | ✅ | Label affiché au-dessus du champ |
| `name` | string | ❌ | Nom du champ (par défaut = id) |
| `error` | string | ❌ | Message d'erreur à afficher |
| `helperText` | string | ❌ | Texte d'aide sous le champ |
| `required` | boolean | ❌ | Marque le champ comme requis |
| `containerClassName` | string | ❌ | Classes CSS pour le conteneur |
| ...props | InputProps | ❌ | Toutes les props HTML input standard |

### TextareaField Props

Identique à FormField, mais accepte les props de `<textarea>` au lieu de `<input>`.

## Avantages

✅ **Accessibilité automatique** : id, name, aria-attributes inclus
✅ **Gestion d'erreurs intégrée** : Affichage et styling automatique
✅ **Texte d'aide** : Support natif pour les helper texts
✅ **Champs requis** : Indicateur visuel automatique (*)
✅ **Cohérence** : Style uniforme dans toute l'application
✅ **Moins de code** : Réduit la duplication

## Migration des Formulaires Existants

### Avant

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    required
  />
  {error && <p className="text-xs text-destructive">{error}</p>}
</div>
```

### Après

```tsx
<FormField
  id="email"
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  error={error}
/>
```

## Bonnes Pratiques

1. **ID Unique** : Utilisez des IDs descriptifs et uniques
   ```tsx
   ✅ id="login-email"
   ✅ id="signup-password"
   ❌ id="input1"
   ```

2. **AutoComplete** : Spécifiez toujours l'attribut autoComplete
   ```tsx
   autoComplete="email"
   autoComplete="current-password"
   autoComplete="new-password"
   autoComplete="off"
   ```

3. **Type Approprié** : Utilisez le bon type d'input
   ```tsx
   type="email"
   type="password"
   type="tel"
   type="number"
   type="date"
   ```

4. **Messages d'Erreur Clairs** : Soyez explicite
   ```tsx
   ✅ error="L'email doit être au format valide"
   ❌ error="Erreur"
   ```

5. **Helper Text Utile** : Guidez l'utilisateur
   ```tsx
   helperText="Format: +237 6XX XXX XXX"
   helperText="Minimum 8 caractères avec majuscules et chiffres"
   ```

## Tests d'Accessibilité

Pour vérifier l'accessibilité de vos formulaires :

```bash
# Lighthouse audit
npm run build
npx lighthouse http://localhost:3000 --view

# axe DevTools
# Installer l'extension Chrome/Firefox axe DevTools
# Analyser la page avec l'extension
```

## Support

Pour toute question ou amélioration, consultez :
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [React Hook Form](https://react-hook-form.com/) pour une gestion avancée
