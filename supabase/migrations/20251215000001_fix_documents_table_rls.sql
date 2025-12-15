-- =====================================================
-- Migration: Correction des politiques RLS pour la table documents
-- Description: Assure que les étudiants peuvent insérer leurs documents
-- Date: 2025-12-15
-- =====================================================

-- Activer RLS sur la table documents si ce n'est pas déjà fait
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques pour éviter les conflits
DROP POLICY IF EXISTS "Students can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Supervisors can view student documents" ON documents;
DROP POLICY IF EXISTS "Jury can view assigned documents" ON documents;
DROP POLICY IF EXISTS "Department heads can view department documents" ON documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON documents;
DROP POLICY IF EXISTS "Students can update their own documents" ON documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON documents;

-- =====================================================
-- POLITIQUES POUR L'INSERTION DE DOCUMENTS
-- =====================================================

-- Permettre aux étudiants d'insérer leurs propres documents
CREATE POLICY "Students can insert their own documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'department_head')
  )
);

-- =====================================================
-- POLITIQUES POUR LA LECTURE DE DOCUMENTS
-- =====================================================

-- Permettre aux utilisateurs de voir leurs propres documents
CREATE POLICY "Users can view their own documents"
ON documents FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
);

-- Permettre aux encadreurs de voir les documents de leurs étudiants
CREATE POLICY "Supervisors can view student documents"
ON documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM supervisor_assignments sa
    WHERE sa.supervisor_id = auth.uid()
    AND sa.student_id = documents.student_id
    AND sa.is_active = true
  ) OR
  EXISTS (
    SELECT 1 FROM thesis_topics tt
    WHERE tt.supervisor_id = auth.uid()
    AND tt.student_id = documents.student_id
  )
);

-- Permettre aux jurys de voir les documents des étudiants assignés
CREATE POLICY "Jury can view assigned documents"
ON documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jury_assignments ja
    WHERE ja.jury_id = auth.uid()
    AND ja.student_id = documents.student_id
  )
);

-- Permettre aux chefs de département de voir les documents de leur département
CREATE POLICY "Department heads can view department documents"
ON documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = auth.uid()
    JOIN profiles student_profile ON student_profile.id = documents.student_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'department_head'
    AND p.department_id = student_profile.department_id
  )
);

-- Permettre aux admins de voir tous les documents
CREATE POLICY "Admins can view all documents"
ON documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- =====================================================
-- POLITIQUES POUR LA MISE À JOUR DE DOCUMENTS
-- =====================================================

-- Permettre aux étudiants de mettre à jour leurs propres documents (statut limité)
CREATE POLICY "Students can update their own documents"
ON documents FOR UPDATE
TO authenticated
USING (
  student_id = auth.uid()
)
WITH CHECK (
  student_id = auth.uid() AND
  -- Les étudiants ne peuvent modifier que certains champs
  (OLD.status = NEW.status OR NEW.status IN ('submitted', 'revision_requested'))
);

-- Permettre aux encadreurs de mettre à jour le statut des documents de leurs étudiants
CREATE POLICY "Supervisors can update student document status"
ON documents FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM supervisor_assignments sa
    WHERE sa.supervisor_id = auth.uid()
    AND sa.student_id = documents.student_id
    AND sa.is_active = true
  ) OR
  EXISTS (
    SELECT 1 FROM thesis_topics tt
    WHERE tt.supervisor_id = auth.uid()
    AND tt.student_id = documents.student_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM supervisor_assignments sa
    WHERE sa.supervisor_id = auth.uid()
    AND sa.student_id = documents.student_id
    AND sa.is_active = true
  ) OR
  EXISTS (
    SELECT 1 FROM thesis_topics tt
    WHERE tt.supervisor_id = auth.uid()
    AND tt.student_id = documents.student_id
  )
);

-- Permettre aux admins de gérer tous les documents
CREATE POLICY "Admins can manage all documents"
ON documents FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- =====================================================
-- POLITIQUES POUR LA SUPPRESSION DE DOCUMENTS
-- =====================================================

-- Permettre aux étudiants de supprimer leurs propres documents (seulement si pas encore validés)
CREATE POLICY "Students can delete their own unvalidated documents"
ON documents FOR DELETE
TO authenticated
USING (
  student_id = auth.uid() AND
  status IN ('submitted', 'revision_requested')
);

-- Permettre aux admins de supprimer tous les documents
CREATE POLICY "Admins can delete all documents"
ON documents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- =====================================================
-- FONCTION DE VÉRIFICATION DES PERMISSIONS
-- =====================================================

CREATE OR REPLACE FUNCTION check_document_permissions(doc_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
  doc_record documents%ROWTYPE;
  user_roles_array TEXT[];
  can_read BOOLEAN := FALSE;
  can_write BOOLEAN := FALSE;
  can_delete BOOLEAN := FALSE;
  result JSONB;
BEGIN
  -- Récupérer le document
  SELECT * INTO doc_record FROM documents WHERE id = doc_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Document not found');
  END IF;

  -- Récupérer les rôles de l'utilisateur
  SELECT array_agg(role::text) INTO user_roles_array
  FROM user_roles
  WHERE user_roles.user_id = check_document_permissions.user_id;

  -- Vérifier si c'est le propriétaire
  IF doc_record.student_id = user_id THEN
    can_read := TRUE;
    can_write := TRUE;
    can_delete := (doc_record.status IN ('submitted', 'revision_requested'));
  END IF;

  -- Vérifier si admin
  IF 'admin' = ANY(user_roles_array) THEN
    can_read := TRUE;
    can_write := TRUE;
    can_delete := TRUE;
  END IF;

  -- Vérifier si encadreur
  IF 'supervisor' = ANY(user_roles_array) THEN
    IF EXISTS (
      SELECT 1 FROM supervisor_assignments sa
      WHERE sa.supervisor_id = user_id
      AND sa.student_id = doc_record.student_id
      AND sa.is_active = true
    ) THEN
      can_read := TRUE;
      can_write := TRUE;
    END IF;
  END IF;

  -- Vérifier si jury
  IF 'jury' = ANY(user_roles_array) THEN
    IF EXISTS (
      SELECT 1 FROM jury_assignments ja
      WHERE ja.jury_id = user_id
      AND ja.student_id = doc_record.student_id
    ) THEN
      can_read := TRUE;
    END IF;
  END IF;

  -- Construire le résultat
  result := jsonb_build_object(
    'document_id', doc_id,
    'user_id', user_id,
    'document_owner', doc_record.student_id,
    'document_status', doc_record.status,
    'permissions', jsonb_build_object(
      'can_read', can_read,
      'can_write', can_write,
      'can_delete', can_delete
    ),
    'user_roles', user_roles_array
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire de documentation
COMMENT ON FUNCTION check_document_permissions IS 'Vérifie les permissions sur un document pour un utilisateur donné';

-- Log de la migration
INSERT INTO migration_logs (migration_name, description, executed_at)
VALUES (
  '20251215000001_fix_documents_table_rls',
  'Correction des politiques RLS pour la table documents - permet l''insertion et la gestion des documents',
  NOW()
) ON CONFLICT (migration_name) DO UPDATE SET
  executed_at = NOW(),
  description = EXCLUDED.description;