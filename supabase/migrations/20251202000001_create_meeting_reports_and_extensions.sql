-- =====================================================
-- Migration: Fiches de rencontre détaillées et extensions
-- Description: Créer les tables pour fiches de rencontre, PV, critères d'évaluation
-- Date: 2025-12-02
-- =====================================================

-- ===== TABLE: meeting_reports (Fiches de rencontre détaillées) =====
-- Chaque rencontre doit avoir une fiche détaillée remplie par l'encadreur

CREATE TABLE IF NOT EXISTS meeting_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL, -- Référence vers thesis_topics ou themes
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Contenu de la fiche
  meeting_date TIMESTAMPTZ NOT NULL,
  objectives_set TEXT NOT NULL, -- Objectifs fixés pour cette rencontre
  work_accomplished TEXT NOT NULL, -- Travail réalisé depuis la dernière rencontre
  chapters_progress JSONB DEFAULT '[]'::jsonb, -- Progression par chapitre
  problems_encountered TEXT, -- Problèmes rencontrés
  solutions_proposed TEXT, -- Solutions proposées
  recommendations TEXT NOT NULL, -- Recommandations de l'encadreur
  next_steps TEXT NOT NULL, -- Prochaines étapes à réaliser
  next_meeting_date TIMESTAMPTZ, -- Date de la prochaine rencontre
  
  -- Évaluation
  progress_rating INTEGER CHECK (progress_rating BETWEEN 1 AND 5),
  engagement_rating INTEGER CHECK (engagement_rating BETWEEN 1 AND 5),
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  
  -- Workflow de validation
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',              -- Brouillon
    'submitted',          -- Soumis au chef de département
    'validated',          -- Validé par le chef
    'rejected'            -- Rejeté par le chef
  )),
  submitted_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  
  -- Signatures
  supervisor_signed BOOLEAN DEFAULT FALSE,
  supervisor_signed_at TIMESTAMPTZ,
  student_acknowledged BOOLEAN DEFAULT FALSE,
  student_acknowledged_at TIMESTAMPTZ,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Ajouter la contrainte FK vers la bonne table (thesis_topics ou themes)
DO $
DECLARE
  v_target_table TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'thesis_topics') THEN
    v_target_table := 'thesis_topics';
  ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'themes') THEN
    v_target_table := 'themes';
  ELSE
    RAISE WARNING '⚠️ Aucune table trouvée pour theme_id';
    RETURN;
  END IF;
  
  EXECUTE format(
    'ALTER TABLE meeting_reports
     ADD CONSTRAINT fk_meeting_reports_theme
     FOREIGN KEY (theme_id) REFERENCES %I(id) ON DELETE CASCADE',
    v_target_table
  );
  
  RAISE NOTICE '✅ Contrainte FK meeting_reports -> %.id ajoutée', v_target_table;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '✅ Contrainte FK existe déjà';
END $;

-- Index
CREATE INDEX idx_meeting_reports_meeting ON meeting_reports(meeting_id);
CREATE INDEX idx_meeting_reports_theme ON meeting_reports(theme_id);
CREATE INDEX idx_meeting_reports_student ON meeting_reports(student_id);
CREATE INDEX idx_meeting_reports_supervisor ON meeting_reports(supervisor_id);
CREATE INDEX idx_meeting_reports_status ON meeting_reports(status);
CREATE INDEX idx_meeting_reports_date ON meeting_reports(meeting_date DESC);

COMMENT ON TABLE meeting_reports IS 'Fiches de rencontre détaillées pour chaque réunion encadreur-étudiant';


-- ===== TABLE: evaluation_criteria (Critères d''évaluation) =====
-- Critères configurables par département

CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  
  -- Informations du critère
  category TEXT NOT NULL CHECK (category IN (
    'supervision',    -- Critères d'encadrement
    'report',         -- Critères du rapport
    'defense'         -- Critères de soutenance
  )),
  name TEXT NOT NULL,
  description TEXT,
  weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
  max_points DECIMAL(5,2) DEFAULT 20.00,
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_evaluation_criteria_department ON evaluation_criteria(department_id);
CREATE INDEX idx_evaluation_criteria_category ON evaluation_criteria(category);
CREATE INDEX idx_evaluation_criteria_active ON evaluation_criteria(is_active);

COMMENT ON TABLE evaluation_criteria IS 'Critères d''évaluation configurables par département';


-- ===== TABLE: defense_minutes (PV de soutenance) =====
-- Procès-verbaux individuels et globaux

CREATE TABLE IF NOT EXISTS defense_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type de PV
  minute_type TEXT NOT NULL CHECK (minute_type IN (
    'individual',  -- PV individuel
    'global'       -- PV global de session
  )),
  
  -- Relations
  defense_session_id UUID REFERENCES defense_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  theme_id UUID, -- Référence vers thesis_topics ou themes
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  
  -- Informations de la soutenance
  defense_date TIMESTAMPTZ NOT NULL,
  defense_location TEXT,
  
  -- Jury
  jury_members JSONB NOT NULL DEFAULT '[]'::jsonb, -- Liste des membres du jury
  jury_president_id UUID REFERENCES profiles(id),
  
  -- Résultats
  final_grade DECIMAL(4,2),
  mention TEXT,
  decision TEXT CHECK (decision IN (
    'approved',
    'approved_with_corrections',
    'rejected'
  )),
  corrections_required BOOLEAN DEFAULT FALSE,
  corrections_deadline DATE,
  corrections_description TEXT,
  
  -- Détails de l'évaluation
  evaluation_details JSONB DEFAULT '{}'::jsonb,
  deliberation_notes TEXT,
  
  -- Signatures numériques
  signatures JSONB DEFAULT '[]'::jsonb, -- Liste des signatures
  all_signed BOOLEAN DEFAULT FALSE,
  
  -- Fichiers
  pdf_path TEXT, -- Chemin vers le PDF généré
  pdf_generated_at TIMESTAMPTZ,
  
  -- Statut
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_signatures',
    'completed',
    'archived'
  )),
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES profiles(id)
);

-- Ajouter la contrainte FK vers la bonne table pour theme_id
DO $
DECLARE
  v_target_table TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'thesis_topics') THEN
    v_target_table := 'thesis_topics';
  ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'themes') THEN
    v_target_table := 'themes';
  ELSE
    RAISE WARNING '⚠️ Aucune table trouvée pour theme_id dans defense_minutes';
    RETURN;
  END IF;
  
  EXECUTE format(
    'ALTER TABLE defense_minutes
     ADD CONSTRAINT fk_defense_minutes_theme
     FOREIGN KEY (theme_id) REFERENCES %I(id) ON DELETE CASCADE',
    v_target_table
  );
  
  RAISE NOTICE '✅ Contrainte FK defense_minutes -> %.id ajoutée', v_target_table;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '✅ Contrainte FK existe déjà';
END $;

-- Index
CREATE INDEX idx_defense_minutes_type ON defense_minutes(minute_type);
CREATE INDEX idx_defense_minutes_defense_session ON defense_minutes(defense_session_id);
CREATE INDEX idx_defense_minutes_student ON defense_minutes(student_id);
CREATE INDEX idx_defense_minutes_department ON defense_minutes(department_id);
CREATE INDEX idx_defense_minutes_status ON defense_minutes(status);
CREATE INDEX idx_defense_minutes_date ON defense_minutes(defense_date DESC);

COMMENT ON TABLE defense_minutes IS 'Procès-verbaux de soutenance individuels et globaux';


-- ===== EXTENSIONS À LA TABLE documents =====
-- Ajouter les colonnes manquantes

DO $ 
BEGIN
  -- Ajouter hash pour vérification d'intégrité
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'file_hash'
  ) THEN
    ALTER TABLE documents ADD COLUMN file_hash TEXT;
    CREATE INDEX idx_documents_hash ON documents(file_hash);
    RAISE NOTICE '✅ Colonne file_hash ajoutée à documents';
  END IF;
  
  -- Ajouter flag de soumission finale
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'is_final_submission'
  ) THEN
    ALTER TABLE documents ADD COLUMN is_final_submission BOOLEAN DEFAULT FALSE;
    CREATE INDEX idx_documents_final_submission ON documents(is_final_submission);
    RAISE NOTICE '✅ Colonne is_final_submission ajoutée à documents';
  END IF;
  
  -- Ajouter date de soumission finale
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'final_submitted_at'
  ) THEN
    ALTER TABLE documents ADD COLUMN final_submitted_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Colonne final_submitted_at ajoutée à documents';
  END IF;
  
  -- Ajouter commentaires de l'encadreur
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'supervisor_comments'
  ) THEN
    ALTER TABLE documents ADD COLUMN supervisor_comments TEXT;
    RAISE NOTICE '✅ Colonne supervisor_comments ajoutée à documents';
  END IF;
  
  -- Ajouter date de révision demandée
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'revision_requested_at'
  ) THEN
    ALTER TABLE documents ADD COLUMN revision_requested_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Colonne revision_requested_at ajoutée à documents';
  END IF;
END $;


-- ===== EXTENSIONS À LA TABLE plagiarism_reports =====
-- Ajouter détails des sources suspectes

DO $ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plagiarism_reports' AND column_name = 'suspicious_sources'
  ) THEN
    ALTER TABLE plagiarism_reports ADD COLUMN suspicious_sources JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE '✅ Colonne suspicious_sources ajoutée à plagiarism_reports';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plagiarism_reports' AND column_name = 'similarity_details'
  ) THEN
    ALTER TABLE plagiarism_reports ADD COLUMN similarity_details JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE '✅ Colonne similarity_details ajoutée à plagiarism_reports';
  END IF;
END $;


-- ===== TRIGGERS =====

-- Trigger pour mettre à jour updated_at sur meeting_reports
CREATE OR REPLACE FUNCTION update_meeting_reports_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_meeting_reports_updated_at
  BEFORE UPDATE ON meeting_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_reports_updated_at();


-- Trigger pour mettre à jour updated_at sur evaluation_criteria
CREATE OR REPLACE FUNCTION update_evaluation_criteria_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_evaluation_criteria_updated_at
  BEFORE UPDATE ON evaluation_criteria
  FOR EACH ROW
  EXECUTE FUNCTION update_evaluation_criteria_updated_at();


-- Trigger pour mettre à jour updated_at sur defense_minutes
CREATE OR REPLACE FUNCTION update_defense_minutes_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_defense_minutes_updated_at
  BEFORE UPDATE ON defense_minutes
  FOR EACH ROW
  EXECUTE FUNCTION update_defense_minutes_updated_at();


-- Trigger pour valider la soumission de fiche de rencontre
CREATE OR REPLACE FUNCTION validate_meeting_report_submission()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
    NEW.submitted_at = NOW();
    
    -- Vérifier que tous les champs obligatoires sont remplis
    IF NEW.objectives_set IS NULL OR NEW.objectives_set = '' THEN
      RAISE EXCEPTION 'Les objectifs fixés sont obligatoires';
    END IF;
    
    IF NEW.work_accomplished IS NULL OR NEW.work_accomplished = '' THEN
      RAISE EXCEPTION 'Le travail accompli est obligatoire';
    END IF;
    
    IF NEW.recommendations IS NULL OR NEW.recommendations = '' THEN
      RAISE EXCEPTION 'Les recommandations sont obligatoires';
    END IF;
    
    IF NEW.next_steps IS NULL OR NEW.next_steps = '' THEN
      RAISE EXCEPTION 'Les prochaines étapes sont obligatoires';
    END IF;
  END IF;
  
  -- Enregistrer la date de validation
  IF NEW.status = 'validated' AND OLD.status != 'validated' THEN
    NEW.validated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_meeting_report_submission
  BEFORE UPDATE ON meeting_reports
  FOR EACH ROW
  EXECUTE FUNCTION validate_meeting_report_submission();


-- ===== ROW LEVEL SECURITY =====

ALTER TABLE meeting_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_minutes ENABLE ROW LEVEL SECURITY;

-- Policies pour meeting_reports
CREATE POLICY "Supervisors can view own meeting reports"
  ON meeting_reports FOR SELECT
  TO authenticated
  USING (supervisor_id = auth.uid() OR student_id = auth.uid());

CREATE POLICY "Supervisors can create meeting reports"
  ON meeting_reports FOR INSERT
  TO authenticated
  WITH CHECK (supervisor_id = auth.uid());

CREATE POLICY "Supervisors can update own meeting reports"
  ON meeting_reports FOR UPDATE
  TO authenticated
  USING (supervisor_id = auth.uid())
  WITH CHECK (supervisor_id = auth.uid());

CREATE POLICY "Department heads can view all meeting reports"
  ON meeting_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'department_head'
    )
  );

CREATE POLICY "Department heads can validate meeting reports"
  ON meeting_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'department_head'
    )
  );

-- Policies pour evaluation_criteria
CREATE POLICY "Everyone can view evaluation criteria"
  ON evaluation_criteria FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Department heads can manage evaluation criteria"
  ON evaluation_criteria FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid() 
        AND ur.role = 'department_head'
        AND p.department_id = evaluation_criteria.department_id
    )
  );

-- Policies pour defense_minutes
CREATE POLICY "Students can view own defense minutes"
  ON defense_minutes FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Jury members can view defense minutes"
  ON defense_minutes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('jury', 'supervisor', 'department_head')
    )
  );

CREATE POLICY "Department heads can manage defense minutes"
  ON defense_minutes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid() 
        AND ur.role = 'department_head'
        AND p.department_id = defense_minutes.department_id
    )
  );


-- ===== FONCTIONS UTILITAIRES =====

-- Fonction pour obtenir les fiches de rencontre d'un étudiant
CREATE OR REPLACE FUNCTION get_student_meeting_reports(p_student_id UUID)
RETURNS TABLE(
  id UUID,
  meeting_date TIMESTAMPTZ,
  status TEXT,
  progress_rating INTEGER,
  supervisor_name TEXT,
  validated BOOLEAN
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    mr.id,
    mr.meeting_date,
    mr.status,
    mr.progress_rating,
    p.first_name || ' ' || p.last_name AS supervisor_name,
    (mr.status = 'validated') AS validated
  FROM meeting_reports mr
  JOIN profiles p ON p.id = mr.supervisor_id
  WHERE mr.student_id = p_student_id
  ORDER BY mr.meeting_date DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fonction pour vérifier si un étudiant peut soumettre son rapport final
CREATE OR REPLACE FUNCTION can_submit_final_report(p_student_id UUID, p_theme_id UUID)
RETURNS JSONB AS $
DECLARE
  v_result JSONB;
  v_can_submit BOOLEAN := TRUE;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_fiche_validated BOOLEAN;
  v_plagiarism_ok BOOLEAN;
  v_min_meetings INTEGER;
  v_actual_meetings INTEGER;
  v_department_id UUID;
BEGIN
  -- Récupérer le département
  SELECT department_id INTO v_department_id
  FROM profiles
  WHERE id = p_student_id;
  
  -- Vérifier la fiche de suivi
  SELECT 
    supervisor_validated AND department_head_validated
  INTO v_fiche_validated
  FROM fiche_suivi
  WHERE theme_id = p_theme_id AND student_id = p_student_id;
  
  IF NOT COALESCE(v_fiche_validated, FALSE) THEN
    v_can_submit := FALSE;
    v_errors := array_append(v_errors, 'La fiche de suivi doit être validée par l''encadreur et le chef de département');
  END IF;
  
  -- Vérifier le plagiat
  SELECT 
    COALESCE(plagiarism_score, 0) <= COALESCE(
      (SELECT plagiarism_threshold FROM department_settings WHERE department_id = v_department_id),
      20
    )
  INTO v_plagiarism_ok
  FROM plagiarism_reports
  WHERE theme_id = p_theme_id
  ORDER BY checked_at DESC
  LIMIT 1;
  
  IF NOT COALESCE(v_plagiarism_ok, FALSE) THEN
    v_can_submit := FALSE;
    v_errors := array_append(v_errors, 'Le score de plagiat dépasse le seuil autorisé');
  END IF;
  
  -- Vérifier le nombre minimum de rencontres
  SELECT COALESCE(min_meetings_required, 3) INTO v_min_meetings
  FROM department_settings
  WHERE department_id = v_department_id;
  
  SELECT COUNT(*) INTO v_actual_meetings
  FROM meeting_reports
  WHERE student_id = p_student_id 
    AND theme_id = p_theme_id
    AND status = 'validated';
  
  IF v_actual_meetings < v_min_meetings THEN
    v_can_submit := FALSE;
    v_errors := array_append(v_errors, 
      format('Nombre de rencontres validées insuffisant (%s/%s)', v_actual_meetings, v_min_meetings)
    );
  END IF;
  
  v_result := jsonb_build_object(
    'can_submit', v_can_submit,
    'errors', to_jsonb(v_errors),
    'checks', jsonb_build_object(
      'fiche_validated', COALESCE(v_fiche_validated, FALSE),
      'plagiarism_ok', COALESCE(v_plagiarism_ok, FALSE),
      'meetings_ok', v_actual_meetings >= v_min_meetings,
      'meetings_count', v_actual_meetings,
      'meetings_required', v_min_meetings
    )
  );
  
  RETURN v_result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
/*
DROP FUNCTION IF EXISTS can_submit_final_report(UUID, UUID);
DROP FUNCTION IF EXISTS get_student_meeting_reports(UUID);
DROP POLICY IF EXISTS "Department heads can manage defense minutes" ON defense_minutes;
DROP POLICY IF EXISTS "Jury members can view defense minutes" ON defense_minutes;
DROP POLICY IF EXISTS "Students can view own defense minutes" ON defense_minutes;
DROP POLICY IF EXISTS "Department heads can manage evaluation criteria" ON evaluation_criteria;
DROP POLICY IF EXISTS "Everyone can view evaluation criteria" ON evaluation_criteria;
DROP POLICY IF EXISTS "Department heads can validate meeting reports" ON meeting_reports;
DROP POLICY IF EXISTS "Department heads can view all meeting reports" ON meeting_reports;
DROP POLICY IF EXISTS "Supervisors can update own meeting reports" ON meeting_reports;
DROP POLICY IF EXISTS "Supervisors can create meeting reports" ON meeting_reports;
DROP POLICY IF EXISTS "Supervisors can view own meeting reports" ON meeting_reports;
DROP TRIGGER IF EXISTS trigger_validate_meeting_report_submission ON meeting_reports;
DROP FUNCTION IF EXISTS validate_meeting_report_submission();
DROP TRIGGER IF EXISTS trigger_update_defense_minutes_updated_at ON defense_minutes;
DROP FUNCTION IF EXISTS update_defense_minutes_updated_at();
DROP TRIGGER IF EXISTS trigger_update_evaluation_criteria_updated_at ON evaluation_criteria;
DROP FUNCTION IF EXISTS update_evaluation_criteria_updated_at();
DROP TRIGGER IF EXISTS trigger_update_meeting_reports_updated_at ON meeting_reports;
DROP FUNCTION IF EXISTS update_meeting_reports_updated_at();
DROP TABLE IF EXISTS defense_minutes CASCADE;
DROP TABLE IF EXISTS evaluation_criteria CASCADE;
DROP TABLE IF EXISTS meeting_reports CASCADE;
*/
