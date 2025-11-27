-- Create storage bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Department heads can read department documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Set up RLS policies for the documents bucket

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to read their own uploaded files
CREATE POLICY "Users can read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow department heads to read all documents in their department
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

-- Allow admins to read all documents
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

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'topic-proposals' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
