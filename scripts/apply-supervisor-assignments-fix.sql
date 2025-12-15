-- =====================================================
-- Script: Application du correctif pour supervisor_assignments
-- Description: Appliquer manuellement sur Supabase via SQL Editor
-- =====================================================

-- Activer RLS sur supervisor_assignments
ALTER TABLE supervisor_assignments ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Students can view own assignment" ON supervisor_assignments;
DROP POLICY IF EXISTS "Supervisors can view their assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "Department heads can view department assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "Department heads can create assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "Department heads can update assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "Admins can manage all assignments" ON supervisor_assignments;

-- Politique: Les étudiants peuvent voir leur propre attribution
CREATE POLICY "Students can view own assignment"
  ON supervisor_assignments FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Politique: Les encadreurs peuvent voir leurs attributions
CREATE POLICY "Supervisors can view their assignments"
  ON supervisor_assignments FOR SELECT
  TO authenticated
  USING (supervisor_id = auth.uid());

-- Politique: Les chefs de département peuvent voir toutes les attributions de leur département
CREATE POLICY "Department heads can view department assignments"
  ON supervisor_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = supervisor_assignments.student_id
        AND p.department_id IN (
          SELECT department_id FROM profiles WHERE id = auth.uid()
        )
    )
    AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
    )
  );

-- Politique: Les chefs de département peuvent créer des attributions pour leur département
CREATE POLICY "Department heads can create assignments"
  ON supervisor_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = supervisor_assignments.student_id
        AND p.department_id IN (
          SELECT department_id FROM profiles WHERE id = auth.uid()
        )
    )
    AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
    )
  );

-- Politique: Les chefs de département peuvent modifier les attributions de leur département
CREATE POLICY "Department heads can update assignments"
  ON supervisor_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = supervisor_assignments.student_id
        AND p.department_id IN (
          SELECT department_id FROM profiles WHERE id = auth.uid()
        )
    )
    AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = supervisor_assignments.student_id
        AND p.department_id IN (
          SELECT department_id FROM profiles WHERE id = auth.uid()
        )
    )
    AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
    )
  );

-- Politique: Les admins peuvent tout gérer
CREATE POLICY "Admins can manage all assignments"
  ON supervisor_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Vérifier que la contrainte UNIQUE existe bien
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supervisor_assignments_student_id_is_active_key'
  ) THEN
    ALTER TABLE supervisor_assignments DROP CONSTRAINT supervisor_assignments_student_id_is_active_key;
  END IF;

  -- Créer une contrainte partielle pour permettre plusieurs attributions inactives
  -- mais une seule attribution active par étudiant
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'unique_active_supervisor_per_student'
  ) THEN
    CREATE UNIQUE INDEX unique_active_supervisor_per_student
      ON supervisor_assignments (student_id)
      WHERE is_active = TRUE;
  END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor 
  ON supervisor_assignments(supervisor_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_active 
  ON supervisor_assignments(is_active) WHERE is_active = TRUE;

-- La table notifications existe déjà, vérifier qu'elle a les bonnes colonnes
DO $$
BEGIN
  -- Ajouter entity_type si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN entity_type TEXT;
  END IF;

  -- Ajouter entity_id si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN entity_id UUID;
  END IF;
END $$;

-- Créer la fonction create_notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    related_entity_type,
    related_entity_id,
    read,
    created_at
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_entity_type,
    p_entity_id,
    FALSE,
    NOW()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifier les politiques créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'supervisor_assignments'
ORDER BY policyname;
