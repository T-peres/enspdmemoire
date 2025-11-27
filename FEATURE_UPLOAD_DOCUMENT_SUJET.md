# Fonctionnalité : Upload de Document pour les Sujets de Mémoire

## Description

Cette fonctionnalité permet aux utilisateurs de joindre un document lors de la proposition d'un nouveau sujet de mémoire. Le document peut contenir des détails supplémentaires, des références, ou toute information pertinente pour le sujet proposé.

## Modifications Apportées

### 1. Base de Données

#### Nouvelle Colonne
- **Table**: `thesis_topics`
- **Colonne**: `attachment_path` (TEXT, nullable)
- **Description**: Chemin du document attaché dans Supabase Storage

#### Bucket de Stockage
- **Nom**: `documents`
- **Type**: Privé (non public)
- **Structure**: `topic-proposals/{user_id}/{filename}`

#### Politiques RLS
- Les utilisateurs peuvent uploader dans leur propre dossier
- Les utilisateurs peuvent lire leurs propres documents
- Les chefs de département peuvent lire tous les documents
- Les admins peuvent lire tous les documents
- Les utilisateurs peuvent supprimer leurs propres documents

### 2. Interface Utilisateur

#### Composant: `ProposeTopicDialog.tsx`

**Nouvelles fonctionnalités:**
- Champ de sélection de fichier
- Validation du type de fichier (PDF, DOC, DOCX, TXT)
- Validation de la taille (max 10 MB)
- Prévisualisation du fichier sélectionné
- Bouton pour retirer le fichier
- Upload automatique lors de la soumission

**Workflow:**
1. L'utilisateur remplit le formulaire de proposition
2. (Optionnel) L'utilisateur sélectionne un fichier
3. Le système valide le fichier (type et taille)
4. Lors de la soumission:
   - Le sujet est créé en base de données
   - Le fichier est uploadé vers Supabase Storage
   - Le chemin du fichier est enregistré dans `attachment_path`

#### Page: `Topics.tsx`

**Nouvelles fonctionnalités:**
- Affichage d'une icône de document si un fichier est attaché
- Bouton de téléchargement du document
- Téléchargement sécurisé via Supabase Storage

### 3. Types TypeScript

**Mise à jour de `ThesisTopic`:**
```typescript
export interface ThesisTopic {
  // ... autres champs
  attachment_path?: string;
}
```

## Installation

### 1. Appliquer les Migrations

Exécutez le script SQL dans l'éditeur SQL de Supabase:

```bash
# Fichier: scripts/apply-attachment-feature.sql
```

Ou appliquez les migrations individuelles:

```bash
# Migration 1: Ajouter la colonne
supabase/migrations/20251127000002_add_attachment_to_thesis_topics.sql

# Migration 2: Configurer le stockage
supabase/migrations/20251127000003_setup_storage_buckets.sql
```

### 2. Vérifier l'Installation

Après avoir exécuté les migrations, vérifiez:

1. **Colonne créée:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'thesis_topics' 
AND column_name = 'attachment_path';
```

2. **Bucket créé:**
```sql
SELECT * FROM storage.buckets WHERE id = 'documents';
```

3. **Politiques créées:**
```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
```

## Utilisation

### Pour les Utilisateurs

1. **Proposer un sujet avec document:**
   - Cliquez sur "Proposer un sujet"
   - Remplissez le formulaire
   - Cliquez sur "Choisir un fichier" dans la section "Document joint"
   - Sélectionnez votre fichier (PDF, DOC, DOCX, ou TXT)
   - Soumettez le formulaire

2. **Télécharger un document attaché:**
   - Parcourez les sujets disponibles
   - Si un sujet a un document attaché, une icône de fichier apparaît
   - Cliquez sur "Télécharger le document"

### Pour les Développeurs

**Upload d'un fichier:**
```typescript
const uploadFile = async (topicId: string, file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${topicId}_${Date.now()}.${fileExt}`;
  const filePath = `topic-proposals/${user.id}/${fileName}`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

  if (error) throw error;
  return filePath;
};
```

**Téléchargement d'un fichier:**
```typescript
const downloadFile = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);

  if (error) throw error;

  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filePath.split('/').pop() || 'document';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

## Sécurité

### Validation Côté Client
- Types de fichiers autorisés: PDF, DOC, DOCX, TXT
- Taille maximale: 10 MB

### Validation Côté Serveur (RLS)
- Les utilisateurs ne peuvent uploader que dans leur propre dossier
- Les chemins de fichiers sont validés par les politiques RLS
- Seuls les utilisateurs autorisés peuvent télécharger les documents

### Bonnes Pratiques
- Les fichiers sont stockés dans des dossiers par utilisateur
- Les noms de fichiers incluent un timestamp pour éviter les collisions
- Les fichiers ne sont pas publics par défaut

## Limitations

- Taille maximale: 10 MB par fichier
- Formats supportés: PDF, DOC, DOCX, TXT
- Un seul fichier par sujet
- Les fichiers ne peuvent pas être modifiés après upload (seulement supprimés et re-uploadés)

## Améliorations Futures

- Support de formats supplémentaires (images, présentations)
- Prévisualisation des documents PDF dans le navigateur
- Gestion de versions multiples
- Compression automatique des fichiers
- Scan antivirus des fichiers uploadés
- Limitation du nombre total de fichiers par utilisateur
- Statistiques d'utilisation du stockage

## Dépannage

### Erreur: "Bucket not found"
- Vérifiez que le bucket 'documents' existe dans Supabase Storage
- Exécutez la migration `20251127000003_setup_storage_buckets.sql`

### Erreur: "Permission denied"
- Vérifiez que les politiques RLS sont correctement configurées
- Vérifiez que l'utilisateur est authentifié

### Erreur: "File too large"
- Vérifiez que le fichier ne dépasse pas 10 MB
- Compressez le fichier si nécessaire

### Le téléchargement ne fonctionne pas
- Vérifiez que `attachment_path` est correctement enregistré
- Vérifiez les permissions de lecture dans les politiques RLS
- Vérifiez la console du navigateur pour les erreurs

## Support

Pour toute question ou problème, consultez:
- Documentation Supabase Storage: https://supabase.com/docs/guides/storage
- Code source: `src/components/topics/ProposeTopicDialog.tsx`
- Migrations: `supabase/migrations/`
