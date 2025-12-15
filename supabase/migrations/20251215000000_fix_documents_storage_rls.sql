-- =====================================================
-- Migration: Correction des politiques RLS pour le stockage de documents
-- Description: Permet l'upload de documents pour les étudiants dans leurs dossiers
-- Date: 2025-12-15
-- =====================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Department heads can read department documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Supervisors can read student documents" ON storage.objects;
DROP POLICY IF EXISTS "Jury can read assigned documents" ON storage.objects;

-- =====================================================
-- POLITIQUES POUR L'UPLOAD DE DOCUMENTS
-- =====================================================

-- Permettre aux utilisateurs authentifiés d'uploader dans leur dossier
CREATE POLICY "Students can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  -- Le chemin doit commencer par l'ID de l'utilisateur
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permettre aux admins d'uploader partout
CREATE POLICY "Admins can upload anywhere"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- =====================================================
-- POLITIQUES POUR LA LECTURE DE DOCUMENTS
-- =====================================================

-- Permettre aux utilisateurs de lire leurs propres documents
CREATE POLICY "Users can read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permettre aux encadreurs de lire les documents de leurs étudiants
CREATE POLICY "Supervisors can read student documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM supervisor_assignments sa
    JOIN thesis_topics tt ON tt.student_id = sa.student_id
    WHERE sa.supervisor_id = auth.uid()
    AND sa.is_active = true
    AND (storage.foldername(name))[1] = sa.student_id::text
  )
);

-- Permettre aux jurys de lire les documents des étudiants qui leur sont assignés
CREATE POLICY "Jury can read assigned documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM jury_assignments ja
    JOIN thesis_topics tt ON tt.student_id = ja.student_id
    WHERE ja.jury_id = auth.uid()
    AND (storage.foldername(name))[1] = ja.student_id::text
  )
);

-- Permettre aux chefs de département de lire les documents de leur département
CREATE POLICY "Department heads can read department documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = auth.uid()
    JOIN profiles student_profile ON student_profile.id = (storage.foldername(name))[1]::uuid
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'department_head'
    AND p.department_id = student_profile.department_id
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

-- =====================================================
-- POLITIQUES POUR LA SUPPRESSION DE DOCUMENTS
-- =====================================================

-- Permettre aux utilisateurs de supprimer leurs propres documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permettre aux admins de supprimer tous les documents
CREATE POLICY "Admins can delete all documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- =====================================================
-- POLITIQUES POUR LA MISE À JOUR DE DOCUMENTS
-- =====================================================

-- Permettre aux utilisateurs de mettre à jour leurs propres documents
CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permettre aux admins de mettre à jour tous les documents
CREATE POLICY "Admins can update all documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- =====================================================
-- VÉRIFICATION ET DOCUMENTATION
-- =====================================================

-- Fonction pour vérifier les permissions de storage
CREATE OR REPLACE FUNCTION check_storage_permissions(user_id UUID, file_path TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  can_read BOOLEAN := FALSE;
  can_write BOOLEAN := FALSE;
  can_delete BOOLEAN := FALSE;
  user_roles TEXT[];
BEGIN
  -- Récupérer les rôles de l'utilisateur
  SELECT array_agg(role::text) INTO user_roles
  FROM user_roles
  WHERE user_roles.user_id = check_storage_permissions.user_id;

  -- Vérifier les permissions de lecture
  IF (storage.foldername(file_path))[1] = user_id::text THEN
    can_read := TRUE;
    can_write := TRUE;
    can_delete := TRUE;
  END IF;

  -- Vérifier si admin
  IF 'admin' = ANY(user_roles) THEN
    can_read := TRUE;
    can_write := TRUE;
    can_delete := TRUE;
  END IF;

  -- Vérifier si encadreur
  IF 'supervisor' = ANY(user_roles) THEN
    IF EXISTS (
      SELECT 1 FROM supervisor_assignments sa
      WHERE sa.supervisor_id = user_id
      AND sa.is_active = true
      AND (storage.foldername(file_path))[1] = sa.student_id::text
    ) THEN
      can_read := TRUE;
    END IF;
  END IF;

  -- Construire le résultat
  result := jsonb_build_object(
    'user_id', user_id,
    'file_path', file_path,
    'permissions', jsonb_build_object(
      'can_read', can_read,
      'can_write', can_write,
      'can_delete', can_delete
    ),
    'user_roles', user_roles
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire de documentation
COMMENT ON FUNCTION check_storage_permissions IS 'Vérifie les permissions de storage pour un utilisateur et un fichier donné';

-- Log de la migration
INSERT INTO migration_logs (migration_name, description, executed_at)
VALUES (
  '20251215000000_fix_documents_storage_rls',
  'Correction des politiques RLS pour le stockage de documents - permet l''upload dans les dossiers utilisateur',
  NOW()
) ON CONFLICT (migration_name) DO UPDATE SET
  executed_at = NOW(),
  description = EXCLUDED.description;