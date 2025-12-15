-- =====================================================
-- CORRECTIF COMPLET - Attribution d'Encadreur
-- Description: Résout TOUS les problèmes en une seule exécution
-- Date: 2025-12-07
-- =====================================================

-- =====================================================
-- PARTIE 1: POLITIQUES RLS SUR supervisor_assignments
-- =====================================================

-- Activer RLS
ALTER TABLE supervisor_assignments ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Students can view own assignment" ON supervisor_assignments;
DROP POLICY IF EXISTS "Supervisors can view their assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "Department heads can view department assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "Department heads can create assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "Department heads can update assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "Admins can manage all assignments" ON supervisor_assignments;

-- Créer les nouvelles politiques
CREATE POLICY "Students can view own assignment"
  ON supervisor_assignments FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Supervisors can view their assignments"
  ON supervisor_assignments FOR SELECT
  TO authenticated
  USING (supervisor_id = auth.uid());

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

-- =====================================================
-- PARTIE 2: INDEX ET CONTRAINTES
-- =====================================================

DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supervisor_assignments_student_id_is_active_key'
  ) THEN
    ALTER TABLE supervisor_assignments DROP CONSTRAINT supervisor_assignments_student_id_is_active_key;
  END IF;

  -- Créer une contrainte partielle
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'unique_active_supervisor_per_student'
  ) THEN
    CREATE UNIQUE INDEX unique_active_supervisor_per_student
      ON supervisor_assignments (student_id)
      WHERE is_active = TRUE;
  END IF;
END $$;

-- Créer des index de performance
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor 
  ON supervisor_assignments(supervisor_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_active 
  ON supervisor_assignments(is_active) WHERE is_active = TRUE;

-- =====================================================
-- PARTIE 3: TABLE NOTIFICATIONS
-- =====================================================

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

-- =====================================================
-- PARTIE 4: FONCTION create_notification
-- =====================================================

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

-- =====================================================
-- PARTIE 5: AJOUTER LE RÔLE À L'UTILISATEUR ACTUEL
-- =====================================================

-- Ajouter le rôle department_head à l'utilisateur actuel
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES (auth.uid(), 'department_head', auth.uid())
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- PARTIE 6: VÉRIFICATIONS
-- =====================================================

-- Vérifier les politiques RLS
SELECT 
  '✅ POLITIQUES RLS' as section,
  COUNT(*) as nombre,
  'Devrait être 6' as attendu
FROM pg_policies
WHERE tablename = 'supervisor_assignments';

-- Vérifier le rôle de l'utilisateur actuel
SELECT 
  '✅ VOTRE RÔLE' as section,
  COALESCE(array_agg(role), ARRAY[]::app_role[]) as roles,
  'Devrait contenir department_head' as attendu
FROM user_roles
WHERE user_id = auth.uid();

-- Vérifier la fonction create_notification
SELECT 
  '✅ FONCTION' as section,
  COUNT(*) as nombre,
  'Devrait être 1' as attendu
FROM pg_proc
WHERE proname = 'create_notification';

-- Vérifier les index
SELECT 
  '✅ INDEX' as section,
  COUNT(*) as nombre,
  'Devrait être >= 3' as attendu
FROM pg_indexes
WHERE tablename = 'supervisor_assignments'
  AND indexname IN (
    'unique_active_supervisor_per_student',
    'idx_supervisor_assignments_supervisor',
    'idx_supervisor_assignments_active'
  );

-- Afficher votre profil complet
SELECT 
  '✅ VOTRE PROFIL' as section,
  p.email,
  p.first_name || ' ' || p.last_name as nom,
  d.code as departement,
  d.name as nom_departement,
  array_agg(DISTINCT ur.role) as roles
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.id = auth.uid()
GROUP BY p.id, p.email, p.first_name, p.last_name, d.code, d.name;

-- Compter les étudiants et encadreurs de votre département
SELECT 
  '✅ UTILISATEURS DISPONIBLES' as section,
  d.code as votre_departement,
  COUNT(DISTINCT CASE WHEN ur.role = 'student' THEN p.id END) as etudiants,
  COUNT(DISTINCT CASE WHEN ur.role = 'supervisor' THEN p.id END) as encadreurs
FROM profiles p
JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE d.id = (SELECT department_id FROM profiles WHERE id = auth.uid())
GROUP BY d.code;

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================

SELECT 
  '🎉 CORRECTIF APPLIQUÉ AVEC SUCCÈS' as message,
  'Déconnectez-vous et reconnectez-vous à l''application' as action_requise,
  'Puis testez l''attribution d''encadreur' as prochaine_etape;

-- =====================================================
-- FIN DU CORRECTIF
-- =====================================================
