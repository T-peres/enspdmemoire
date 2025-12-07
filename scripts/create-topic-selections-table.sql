-- Créer la table topic_selections si elle n'existe pas
-- Cette table gère les sélections de sujets par les étudiants

CREATE TABLE IF NOT EXISTS public.topic_selections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES thesis_topics(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT unique_active_selection UNIQUE (student_id, topic_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_topic_selections_student_id ON topic_selections(student_id);
CREATE INDEX IF NOT EXISTS idx_topic_selections_topic_id ON topic_selections(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_selections_status ON topic_selections(status);
CREATE INDEX IF NOT EXISTS idx_topic_selections_selected_at ON topic_selections(selected_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_topic_selections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_topic_selections_updated_at ON topic_selections;
CREATE TRIGGER trigger_update_topic_selections_updated_at
  BEFORE UPDATE ON topic_selections
  FOR EACH ROW
  EXECUTE FUNCTION update_topic_selections_updated_at();

-- Activer RLS
ALTER TABLE topic_selections ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour topic_selections
DROP POLICY IF EXISTS "topic_selections_select_policy" ON topic_selections;
CREATE POLICY "topic_selections_select_policy" ON topic_selections
  FOR SELECT
  TO authenticated
  USING (
    -- L'étudiant peut voir ses propres sélections
    student_id = auth.uid()
    OR
    -- Le superviseur peut voir les sélections de ses sujets
    EXISTS (
      SELECT 1 FROM thesis_topics tt
      WHERE tt.id = topic_selections.topic_id
        AND tt.supervisor_id = auth.uid()
    )
    OR
    -- Le chef de département peut voir les sélections de son département
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
        AND ur.role = 'department_head'
        AND EXISTS (
          SELECT 1 FROM thesis_topics tt
          WHERE tt.id = topic_selections.topic_id
            AND tt.department_id = p.department_id
        )
    )
    OR
    -- Les admins peuvent tout voir
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "topic_selections_insert_policy" ON topic_selections;
CREATE POLICY "topic_selections_insert_policy" ON topic_selections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- L'étudiant peut créer ses propres sélections
    student_id = auth.uid()
    AND
    -- L'étudiant doit avoir le rôle student
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'student'
    )
  );

DROP POLICY IF EXISTS "topic_selections_update_policy" ON topic_selections;
CREATE POLICY "topic_selections_update_policy" ON topic_selections
  FOR UPDATE
  TO authenticated
  USING (
    -- L'étudiant peut modifier ses propres sélections
    student_id = auth.uid()
    OR
    -- Le superviseur peut modifier les sélections de ses sujets
    EXISTS (
      SELECT 1 FROM thesis_topics tt
      WHERE tt.id = topic_selections.topic_id
        AND tt.supervisor_id = auth.uid()
    )
    OR
    -- Le chef de département peut modifier les sélections
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
        AND ur.role = 'department_head'
    )
    OR
    -- Les admins peuvent tout modifier
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "topic_selections_delete_policy" ON topic_selections;
CREATE POLICY "topic_selections_delete_policy" ON topic_selections
  FOR DELETE
  TO authenticated
  USING (
    -- L'étudiant peut supprimer ses sélections en attente
    (student_id = auth.uid() AND status = 'pending')
    OR
    -- Les admins peuvent tout supprimer
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Commentaires
COMMENT ON TABLE topic_selections IS 'Gère les sélections de sujets de thèse par les étudiants';
COMMENT ON COLUMN topic_selections.status IS 'Statut de la sélection: pending, confirmed, cancelled';
COMMENT ON COLUMN topic_selections.selected_at IS 'Date de la sélection initiale';
COMMENT ON COLUMN topic_selections.confirmed_at IS 'Date de confirmation de la sélection';
COMMENT ON COLUMN topic_selections.cancelled_at IS 'Date d''annulation de la sélection';

-- Vérifier la création
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'topic_selections'
ORDER BY ordinal_position;

-- Vérifier les politiques
SELECT 
  policyname as "Politique",
  cmd as "Commande"
FROM pg_policies
WHERE tablename = 'topic_selections'
ORDER BY policyname;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Table topic_selections créée avec succès';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Fonctionnalités:';
  RAISE NOTICE '  • Gestion des sélections de sujets par les étudiants';
  RAISE NOTICE '  • Statuts: pending, confirmed, cancelled';
  RAISE NOTICE '  • Contrainte: une seule sélection active par étudiant/sujet';
  RAISE NOTICE '  • 4 politiques RLS créées';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Rafraîchissez votre application (Ctrl+F5)';
END $$;
