-- ============================================================
-- ÉTAPE 1: Ajouter la colonne attachment_path
-- ============================================================
-- Exécutez cette requête en premier

ALTER TABLE thesis_topics
ADD COLUMN IF NOT EXISTS attachment_path TEXT;

COMMENT ON COLUMN thesis_topics.attachment_path IS 'Path to the attached document in Supabase Storage (optional)';

-- Vérification
SELECT 
  'Colonne ajoutée' as status,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' 
    AND column_name = 'attachment_path'
  ) as success;

-- ============================================================
-- ÉTAPE 2: Créer le bucket de stockage
-- ============================================================
-- Exécutez cette requête après l'étape 1

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Vérification
SELECT 
  'Bucket créé' as status,
  EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'documents'
  ) as success;

-- ============================================================
-- ÉTAPE 3: Supprimer les anciennes politiques (si elles existent)
-- ============================================================
-- Exécutez cette requête après l'étape 2

DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Department heads can read department documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- ============================================================
-- ÉTAPE 4: Créer la politique d'upload
-- ============================================================
-- Exécutez cette requête après l'étape 3

CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================================
-- ÉTAPE 5: Créer la politique de lecture (utilisateurs)
-- ============================================================
-- Exécutez cette requête après l'étape 4

CREATE POLICY "Users can read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================================
-- ÉTAPE 6: Créer la politique de lecture (chefs de département)
-- ============================================================
-- Exécutez cette requête après l'étape 5

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

-- ============================================================
-- ÉTAPE 7: Créer la politique de lecture (admins)
-- ============================================================
-- Exécutez cette requête après l'étape 6

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

-- ============================================================
-- ÉTAPE 8: Créer la politique de suppression
-- ============================================================
-- Exécutez cette requête après l'étape 7

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================================
-- VÉRIFICATION FINALE
-- ============================================================
-- Exécutez cette requête pour vérifier que tout est en place

SELECT 
  'Résumé de l''installation' as titre,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'thesis_topics' AND column_name = 'attachment_path') as colonne_existe,
  (SELECT COUNT(*) FROM storage.buckets WHERE id = 'documents') as bucket_existe,
  (SELECT COUNT(*) FROM pg_policies 
   WHERE tablename = 'objects' AND schemaname = 'storage' 
   AND policyname IN (
     'Users can upload their own documents',
     'Users can read their own documents',
     'Department heads can read department documents',
     'Admins can read all documents',
     'Users can delete their own documents'
   )) as politiques_creees;
