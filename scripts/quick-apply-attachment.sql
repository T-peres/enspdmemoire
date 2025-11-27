-- Script rapide pour ajouter la fonctionnalité d'upload de documents
-- Exécutez ce script complet dans l'éditeur SQL de Supabase

-- 1. Ajouter la colonne
ALTER TABLE thesis_topics ADD COLUMN IF NOT EXISTS attachment_path TEXT;

-- 2. Créer le bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;

-- 3. Nettoyer les anciennes politiques
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read their own documents" ON storage.objects;
  DROP POLICY IF EXISTS "Department heads can read department documents" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can read all documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4. Créer les nouvelles politiques
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can read their own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Department heads can read department documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'department_head'
  )
);

CREATE POLICY "Admins can read all documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Vérification
SELECT 'Installation terminée' as status;
