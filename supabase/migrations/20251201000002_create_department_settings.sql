-- =====================================================
-- Migration: Création de la table department_settings
-- Description: Paramètres configurables par département
-- Date: 2025-12-01
-- =====================================================

-- Vérifier si la table existe déjà et la supprimer si nécessaire
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'department_settings'
  ) THEN
    -- Vérifier si la colonne supervision_weight existe
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'department_settings'
        AND column_name = 'supervision_weight'
    ) THEN
      RAISE NOTICE '⚠️ Table department_settings existe avec un schéma différent - suppression et recréation';
      DROP TABLE department_settings CASCADE;
    ELSE
      RAISE NOTICE '✅ Table department_settings existe déjà avec le bon schéma';
    END IF;
  END IF;
END $$;

-- Création de la table department_settings
CREATE TABLE IF NOT EXISTS department_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL UNIQUE REFERENCES departments(id) ON DELETE CASCADE,
  
  -- ===== PONDÉRATIONS DES NOTES =====
  supervision_weight DECIMAL(3,2) DEFAULT 0.40 CHECK (supervision_weight BETWEEN 0 AND 1),
  report_weight DECIMAL(3,2) DEFAULT 0.40 CHECK (report_weight BETWEEN 0 AND 1),
  defense_weight DECIMAL(3,2) DEFAULT 0.20 CHECK (defense_weight BETWEEN 0 AND 1),
  
  -- ===== SEUILS ET LIMITES =====
  plagiarism_threshold DECIMAL(5,2) DEFAULT 20.00 CHECK (plagiarism_threshold BETWEEN 0 AND 100),
  min_passing_grade DECIMAL(4,2) DEFAULT 10.00 CHECK (min_passing_grade BETWEEN 0 AND 20),
  max_students_per_supervisor INTEGER DEFAULT 5 CHECK (max_students_per_supervisor > 0),
  min_meetings_required INTEGER DEFAULT 3 CHECK (min_meetings_required >= 0),
  min_fiche_suivi_required INTEGER DEFAULT 3 CHECK (min_fiche_suivi_required >= 0),
  
  -- ===== DATES CLÉS =====
  academic_year TEXT NOT NULL DEFAULT '2024-2025',
  theme_submission_start_date DATE,
  theme_submission_end_date DATE,
  theme_selection_start_date DATE,
  theme_selection_end_date DATE,
  report_submission_start_date DATE,
  report_submission_end_date DATE,
  defense_start_date DATE,
  defense_end_date DATE,
  
  -- ===== PARAMÈTRES DE SOUTENANCE =====
  defense_duration_minutes INTEGER DEFAULT 45 CHECK (defense_duration_minutes > 0),
  min_jury_members INTEGER DEFAULT 3 CHECK (min_jury_members >= 2),
  max_jury_members INTEGER DEFAULT 5 CHECK (max_jury_members >= min_jury_members),
  
  -- ===== NOTIFICATIONS =====
  enable_email_notifications BOOLEAN DEFAULT TRUE,
  enable_deadline_reminders BOOLEAN DEFAULT TRUE,
  deadline_reminder_days INTEGER DEFAULT 7 CHECK (deadline_reminder_days >= 0),
  
  -- ===== DOCUMENTS REQUIS =====
  required_document_types JSONB DEFAULT '["proposal", "intermediate_report", "final_report", "presentation"]'::jsonb,
  
  -- ===== MODÈLES DE DOCUMENTS =====
  defense_minutes_template TEXT,
  convocation_template TEXT,
  certificate_template TEXT,
  
  -- ===== CRITÈRES D'ÉVALUATION =====
  custom_evaluation_criteria JSONB DEFAULT '[]'::jsonb,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Contrainte: La somme des pondérations doit être égale à 1
ALTER TABLE department_settings
  ADD CONSTRAINT weights_sum_check CHECK (
    ABS((supervision_weight + report_weight + defense_weight) - 1.00) < 0.01
  );

-- Contrainte: Les dates doivent être cohérentes
ALTER TABLE department_settings
  ADD CONSTRAINT dates_coherence_check CHECK (
    (theme_submission_start_date IS NULL OR theme_submission_end_date IS NULL OR 
     theme_submission_start_date <= theme_submission_end_date)
    AND
    (theme_selection_start_date IS NULL OR theme_selection_end_date IS NULL OR 
     theme_selection_start_date <= theme_selection_end_date)
    AND
    (report_submission_start_date IS NULL OR report_submission_end_date IS NULL OR 
     report_submission_start_date <= report_submission_end_date)
    AND
    (defense_start_date IS NULL OR defense_end_date IS NULL OR 
     defense_start_date <= defense_end_date)
  );

-- Index
CREATE INDEX idx_department_settings_department ON department_settings(department_id);
CREATE INDEX idx_department_settings_academic_year ON department_settings(academic_year);

-- Commentaires pour documentation
COMMENT ON TABLE department_settings IS 'Paramètres configurables par département pour personnaliser le workflow';
COMMENT ON COLUMN department_settings.supervision_weight IS 'Pondération de la note d''encadrement (0-1)';
COMMENT ON COLUMN department_settings.report_weight IS 'Pondération de la note du rapport (0-1)';
COMMENT ON COLUMN department_settings.defense_weight IS 'Pondération de la note de soutenance (0-1)';
COMMENT ON COLUMN department_settings.plagiarism_threshold IS 'Seuil maximum de plagiat autorisé (%)';
COMMENT ON COLUMN department_settings.required_document_types IS 'Types de documents requis (JSON array)';
COMMENT ON COLUMN department_settings.custom_evaluation_criteria IS 'Critères d''évaluation personnalisés (JSON array)';

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_department_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_department_settings_updated_at
  BEFORE UPDATE ON department_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_department_settings_updated_at();

-- Fonction pour créer les paramètres par défaut pour un département
CREATE OR REPLACE FUNCTION create_default_department_settings(p_department_id UUID)
RETURNS UUID AS $$
DECLARE
  v_settings_id UUID;
BEGIN
  INSERT INTO department_settings (department_id, created_by)
  VALUES (p_department_id, auth.uid())
  ON CONFLICT (department_id) DO NOTHING
  RETURNING id INTO v_settings_id;
  
  RETURN v_settings_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement les paramètres lors de la création d'un département
CREATE OR REPLACE FUNCTION auto_create_department_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO department_settings (department_id)
  VALUES (NEW.id)
  ON CONFLICT (department_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_department_settings
  AFTER INSERT ON departments
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_department_settings();

-- Activer Row Level Security
ALTER TABLE department_settings ENABLE ROW LEVEL SECURITY;

-- Politique: Les chefs de département peuvent voir les paramètres de leur département
CREATE POLICY "Department heads can view own settings"
  ON department_settings FOR SELECT
  TO authenticated
  USING (
    department_id IN (
      SELECT department_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Politique: Les chefs de département peuvent modifier les paramètres de leur département
CREATE POLICY "Department heads can update own settings"
  ON department_settings FOR UPDATE
  TO authenticated
  USING (
    department_id IN (
      SELECT department_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
    )
  )
  WITH CHECK (
    department_id IN (
      SELECT department_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Politique: Seuls les admins peuvent créer des paramètres
CREATE POLICY "Admins can create settings"
  ON department_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Fonction pour obtenir les paramètres d'un département
CREATE OR REPLACE FUNCTION get_department_settings(p_department_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_settings JSONB;
BEGIN
  SELECT to_jsonb(ds.*) INTO v_settings
  FROM department_settings ds
  WHERE ds.department_id = p_department_id;
  
  -- Si aucun paramètre n'existe, créer les paramètres par défaut
  IF v_settings IS NULL THEN
    PERFORM create_default_department_settings(p_department_id);
    
    SELECT to_jsonb(ds.*) INTO v_settings
    FROM department_settings ds
    WHERE ds.department_id = p_department_id;
  END IF;
  
  RETURN v_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour valider si un étudiant peut soumettre (basé sur les dates)
CREATE OR REPLACE FUNCTION can_submit_report(p_student_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_department_id UUID;
  v_settings RECORD;
  v_can_submit BOOLEAN;
BEGIN
  -- Récupérer le département de l'étudiant
  SELECT department_id INTO v_department_id
  FROM profiles
  WHERE id = p_student_id;
  
  -- Récupérer les paramètres du département
  SELECT * INTO v_settings
  FROM department_settings
  WHERE department_id = v_department_id;
  
  -- Vérifier si on est dans la période de soumission
  v_can_submit := (
    v_settings.report_submission_start_date IS NULL OR
    v_settings.report_submission_end_date IS NULL OR
    (CURRENT_DATE >= v_settings.report_submission_start_date AND
     CURRENT_DATE <= v_settings.report_submission_end_date)
  );
  
  RETURN v_can_submit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Pour annuler cette migration, exécuter:
/*
DROP FUNCTION IF EXISTS can_submit_report(UUID);
DROP FUNCTION IF EXISTS get_department_settings(UUID);
DROP POLICY IF EXISTS "Admins can create settings" ON department_settings;
DROP POLICY IF EXISTS "Department heads can update own settings" ON department_settings;
DROP POLICY IF EXISTS "Department heads can view own settings" ON department_settings;
DROP TRIGGER IF EXISTS trigger_auto_create_department_settings ON departments;
DROP FUNCTION IF EXISTS auto_create_department_settings();
DROP FUNCTION IF EXISTS create_default_department_settings(UUID);
DROP TRIGGER IF EXISTS trigger_update_department_settings_updated_at ON department_settings;
DROP FUNCTION IF EXISTS update_department_settings_updated_at();
DROP TABLE IF EXISTS department_settings CASCADE;
*/
