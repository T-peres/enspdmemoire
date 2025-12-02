-- =====================================================
-- Migration: Création de la table meetings
-- Description: Gestion complète des rencontres encadreur-étudiant
-- Date: 2025-12-01
-- =====================================================

-- Création de la table meetings
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  -- Note: theme_id peut référencer soit themes (vue) soit thesis_topics (table)
  -- La contrainte FK sera ajoutée conditionnellement après
  theme_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Informations de la rencontre
  meeting_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60 CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  location TEXT,
  meeting_type TEXT DEFAULT 'regular' CHECK (meeting_type IN (
    'regular',           -- Rencontre régulière
    'progress_review',   -- Revue d'avancement
    'problem_solving',   -- Résolution de problèmes
    'final_review',      -- Revue finale
    'emergency'          -- Urgence
  )),
  
  -- Contenu de la rencontre
  objectives TEXT,                    -- Objectifs de la rencontre
  work_done TEXT,                     -- Travail réalisé depuis la dernière rencontre
  problems_encountered TEXT,          -- Problèmes rencontrés
  recommendations TEXT,               -- Recommandations de l'encadreur
  next_steps TEXT,                    -- Prochaines étapes
  next_meeting_date TIMESTAMPTZ,      -- Date de la prochaine rencontre
  
  -- Évaluation de l'avancement
  progress_rating INTEGER CHECK (progress_rating BETWEEN 1 AND 5),
  student_engagement_rating INTEGER CHECK (student_engagement_rating BETWEEN 1 AND 5),
  
  -- Signatures électroniques
  student_signature BOOLEAN DEFAULT FALSE,
  student_signed_at TIMESTAMPTZ,
  supervisor_signature BOOLEAN DEFAULT FALSE,
  supervisor_signed_at TIMESTAMPTZ,
  
  -- Pièces jointes
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Statut
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',   -- Planifiée
    'completed',   -- Terminée
    'cancelled',   -- Annulée
    'rescheduled'  -- Reportée
  )),
  cancellation_reason TEXT,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter la contrainte de clé étrangère vers la bonne table
DO $$
DECLARE
  v_target_table TEXT;
  v_has_pk BOOLEAN;
BEGIN
  -- Déterminer quelle table utiliser pour la FK
  -- Priorité: thesis_topics (table) > themes (si c'est une table)
  
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'thesis_topics'
  ) THEN
    v_target_table := 'thesis_topics';
    RAISE NOTICE 'ℹ️ Utilisation de thesis_topics comme table de référence';
  ELSIF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'themes'
  ) THEN
    v_target_table := 'themes';
    RAISE NOTICE 'ℹ️ Utilisation de themes comme table de référence';
  ELSE
    RAISE WARNING '⚠️ Aucune table trouvée (themes ou thesis_topics) - contrainte FK non ajoutée';
    RAISE WARNING '⚠️ La colonne theme_id restera sans contrainte FK';
    RETURN;
  END IF;
  
  -- Vérifier si la table cible a une clé primaire sur id
  EXECUTE format(
    'SELECT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = ''public''
        AND t.relname = %L
        AND c.contype IN (''p'', ''u'')
        AND c.conkey = ARRAY[(
          SELECT attnum FROM pg_attribute
          WHERE attrelid = t.oid AND attname = ''id''
        )]
    )', v_target_table
  ) INTO v_has_pk;
  
  IF NOT v_has_pk THEN
    RAISE WARNING '⚠️ La colonne %.id n''a pas de contrainte PRIMARY KEY ou UNIQUE', v_target_table;
    RAISE WARNING '⚠️ Contrainte FK non ajoutée';
    RETURN;
  END IF;
  
  -- Ajouter la contrainte de clé étrangère
  BEGIN
    EXECUTE format(
      'ALTER TABLE meetings
       ADD CONSTRAINT fk_meetings_theme
       FOREIGN KEY (theme_id) REFERENCES %I(id) ON DELETE CASCADE',
      v_target_table
    );
    
    RAISE NOTICE '✅ Contrainte FK meetings -> %.id ajoutée avec succès', v_target_table;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE '✅ Contrainte FK meetings -> theme existe déjà';
    WHEN OTHERS THEN
      RAISE WARNING '⚠️ Impossible d''ajouter la contrainte FK vers %: %', v_target_table, SQLERRM;
      RAISE WARNING '⚠️ La table meetings fonctionnera sans contrainte FK';
  END;
END $$;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_meetings_theme_id ON meetings(theme_id);
CREATE INDEX IF NOT EXISTS idx_meetings_student_id ON meetings(student_id);
CREATE INDEX IF NOT EXISTS idx_meetings_supervisor_id ON meetings(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_signatures ON meetings(student_signature, supervisor_signature);

-- Commentaires pour documentation
COMMENT ON TABLE meetings IS 'Historique complet des rencontres entre encadreurs et étudiants';
COMMENT ON COLUMN meetings.meeting_type IS 'Type de rencontre (régulière, revue, urgence, etc.)';
COMMENT ON COLUMN meetings.progress_rating IS 'Évaluation de l''avancement (1-5)';
COMMENT ON COLUMN meetings.student_engagement_rating IS 'Évaluation de l''engagement étudiant (1-5)';
COMMENT ON COLUMN meetings.attachments IS 'Documents joints à la rencontre (JSON array)';

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meetings_updated_at();

-- Trigger pour valider les signatures
CREATE OR REPLACE FUNCTION validate_meeting_signatures()
RETURNS TRIGGER AS $$
BEGIN
  -- Si signature étudiant activée, enregistrer la date
  IF NEW.student_signature = TRUE AND OLD.student_signature = FALSE THEN
    NEW.student_signed_at = NOW();
  END IF;
  
  -- Si signature encadreur activée, enregistrer la date
  IF NEW.supervisor_signature = TRUE AND OLD.supervisor_signature = FALSE THEN
    NEW.supervisor_signed_at = NOW();
  END IF;
  
  -- Si les deux signatures sont présentes, marquer comme complétée
  IF NEW.student_signature = TRUE AND NEW.supervisor_signature = TRUE THEN
    NEW.status = 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_meeting_signatures
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION validate_meeting_signatures();

-- Activer Row Level Security
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Politique: Les étudiants peuvent voir leurs propres rencontres
CREATE POLICY "Students can view own meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Politique: Les encadreurs peuvent voir les rencontres de leurs étudiants
CREATE POLICY "Supervisors can view assigned meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (
    supervisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'department_head'
    )
  );

-- Politique: Les encadreurs peuvent créer des rencontres
CREATE POLICY "Supervisors can create meetings"
  ON meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    supervisor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM supervisor_assignments
      WHERE supervisor_id = auth.uid()
        AND student_id = meetings.student_id
        AND is_active = TRUE
    )
  );

-- Politique: Les encadreurs peuvent modifier leurs rencontres
CREATE POLICY "Supervisors can update own meetings"
  ON meetings FOR UPDATE
  TO authenticated
  USING (supervisor_id = auth.uid())
  WITH CHECK (supervisor_id = auth.uid());

-- Politique: Les étudiants peuvent signer leurs rencontres
-- Note: Les étudiants peuvent uniquement modifier leur signature, pas le reste
CREATE POLICY "Students can sign own meetings"
  ON meetings FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Fonction pour obtenir les statistiques des rencontres
CREATE OR REPLACE FUNCTION get_meeting_statistics(p_student_id UUID DEFAULT NULL, p_supervisor_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_total_meetings INTEGER;
  v_completed_meetings INTEGER;
  v_avg_duration DECIMAL;
  v_avg_progress_rating DECIMAL;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    AVG(duration_minutes),
    AVG(progress_rating)
  INTO 
    v_total_meetings,
    v_completed_meetings,
    v_avg_duration,
    v_avg_progress_rating
  FROM meetings
  WHERE (p_student_id IS NULL OR student_id = p_student_id)
    AND (p_supervisor_id IS NULL OR supervisor_id = p_supervisor_id);
  
  v_result := jsonb_build_object(
    'total_meetings', v_total_meetings,
    'completed_meetings', v_completed_meetings,
    'completion_rate', CASE WHEN v_total_meetings > 0 
      THEN ROUND((v_completed_meetings::DECIMAL / v_total_meetings) * 100, 2)
      ELSE 0 END,
    'avg_duration_minutes', ROUND(v_avg_duration, 0),
    'avg_progress_rating', ROUND(v_avg_progress_rating, 2)
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Pour annuler cette migration, exécuter:
/*
DROP FUNCTION IF EXISTS get_meeting_statistics(UUID, UUID);
DROP POLICY IF EXISTS "Students can sign own meetings" ON meetings;
DROP POLICY IF EXISTS "Supervisors can update own meetings" ON meetings;
DROP POLICY IF EXISTS "Supervisors can create meetings" ON meetings;
DROP POLICY IF EXISTS "Supervisors can view assigned meetings" ON meetings;
DROP POLICY IF EXISTS "Students can view own meetings" ON meetings;
DROP TRIGGER IF EXISTS trigger_validate_meeting_signatures ON meetings;
DROP FUNCTION IF EXISTS validate_meeting_signatures();
DROP TRIGGER IF EXISTS trigger_update_meetings_updated_at ON meetings;
DROP FUNCTION IF EXISTS update_meetings_updated_at();
DROP TABLE IF EXISTS meetings CASCADE;
*/
