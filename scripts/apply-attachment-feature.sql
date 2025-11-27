-- Script pour appliquer la fonctionnalité d'upload de documents pour les sujets de mémoire
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Ajouter la colonne attachment_path à thesis_topics
ALTER TABLE thesis_topics
ADD COLUMN IF NOT EXISTS attachment_path TEXT;

COMMENT ON COLUMN thesis_topics.attachment_path IS 'Path to the attached document in Supabase Storage (optional)';

-- 2. Créer le bucket de stockage pour les documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Department heads can read department documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- 4. Créer les politiques RLS pour le bucket documents

-- Permettre aux utilisateurs authentifiés d'uploader dans leur propre dossier
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Permettre aux utilisateurs de lire leurs propres documents
CREATE POLICY "Users can read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Permettre aux chefs de département de lire tous les documents de leur département
CREATE POLICY "Department heads can read department documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = auth.uid()
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'department_head'
  )
);

-- Permettre aux admins de lire tous les documents
CREATE POLICY "Admins can read all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Permettre aux utilisateurs de supprimer leurs propres documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Vérification
SELECT 
  'thesis_topics column added' as status,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' 
    AND column_name = 'attachment_path'
  ) as column_exists;

SELECT 
  'documents bucket created' as status,
  EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'documents'
  ) as bucket_exists;

SELECT 
  'storage policies created' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%documents%';
