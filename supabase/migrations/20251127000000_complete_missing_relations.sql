-- =====================================================
-- MIGRATION: Tables Manquantes pour Relations Complètes
-- Date: 2025-11-27
-- Description: Ajoute toutes les tables nécessaires pour
--              implémenter les relations demandées
-- =====================================================

-- =====================================================
-- TABLE: report_submissions (Dépôts de rapports)
-- =====================================================

CREATE TABLE IF NOT EXISTS report_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES thesis_topics(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  plagiarism_report_id UUID UNIQUE, -- Relation 1-1 avec plagiarism_reports
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'revision_requested')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, theme_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_report_submissions_student ON report_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_report_submissions_theme ON report_submissions(theme_id);
CREATE INDEX IF NOT EXISTS idx_report_submissions_status ON report_submissions(status);

-- =====================================================
-- TABLE: supervisor_comments (Commentaires encadreur)
-- =====================================================

CREATE TABLE IF NOT EXISTS supervisor_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_submission_id UUID NOT NULL REFERENCES report_submissions(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  commented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supervisor_comments_report ON supervisor_comments(report_submission_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_comments_supervisor ON supervisor_comments(supervisor_id);

-- =====================================================
-- TABLE: defense_rooms (Salles de soutenance)
-- =====================================================

CREATE TABLE IF NOT EXISTS defense_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 30,
  location TEXT,
  equipment TEXT[], -- Projecteur, tableau, etc.
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defense_rooms_available ON defense_rooms(is_available);

-- =====================================================
-- TABLE: defense_sessions (Séances de soutenance)
-- =====================================================

CREATE TABLE IF NOT EXISTS defense_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE, -- Une seule soutenance par étudiant
  theme_id UUID NOT NULL REFERENCES thesis_topics(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id),
  room_id UUID NOT NULL REFERENCES defense_rooms(id),
  scheduled_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defense_sessions_student ON defense_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_defense_sessions_theme ON defense_sessions(theme_id);
CREATE INDEX IF NOT EXISTS idx_defense_sessions_department ON defense_sessions(department_id);
CREATE INDEX IF NOT EXISTS idx_defense_sessions_room ON defense_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_defense_sessions_date ON defense_sessions(scheduled_date);

-- =====================================================
-- TABLE: defense_jury_members (Membres du jury)
-- =====================================================

CREATE TABLE IF NOT EXISTS defense_jury_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defense_session_id UUID NOT NULL REFERENCES defense_sessions(id) ON DELETE CASCADE,
  jury_member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('president', 'examiner', 'rapporteur')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(defense_session_id, jury_member_id)
);

CREATE INDEX IF NOT EXISTS idx_defense_jury_defense ON defense_jury_members(defense_session_id);
CREATE INDEX IF NOT EXISTS idx_defense_jury_member ON defense_jury_members(jury_member_id);

-- =====================================================
-- TABLE: defense_minutes (PV de soutenance)
-- =====================================================

CREATE TABLE IF NOT EXISTS defense_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defense_session_id UUID NOT NULL UNIQUE REFERENCES defense_sessions(id) ON DELETE CASCADE, -- Un seul PV par soutenance
  student_id UUID NOT NULL REFERENCES profiles(id),
  theme_id UUID NOT NULL REFERENCES thesis_topics(id),
  jury_decision TEXT NOT NULL CHECK (jury_decision IN ('approved', 'approved_with_corrections', 'rejected')),
  final_grade DECIMAL(4,2) CHECK (final_grade BETWEEN 0 AND 20),
  observations TEXT,
  corrections_required BOOLEAN DEFAULT FALSE,
  corrections_deadline TIMESTAMPTZ,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_by_president UUID REFERENCES profiles(id),
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defense_minutes_defense ON defense_minutes(defense_session_id);
CREATE INDEX IF NOT EXISTS idx_defense_minutes_student ON defense_minutes(student_id);

-- =====================================================
-- TABLE: evaluation_criteria (Critères d'évaluation)
-- =====================================================

CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('supervision', 'report', 'defense')),
  max_points DECIMAL(4,2) NOT NULL DEFAULT 20.00,
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- Pondération
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insérer les critères par défaut
INSERT INTO evaluation_criteria (name, description, category, max_points, weight) VALUES
  ('Assiduité et engagement', 'Présence régulière aux rencontres d''encadrement', 'supervision', 20.00, 0.40),
  ('Qualité du travail', 'Qualité du travail fourni pendant l''encadrement', 'supervision', 20.00, 0.60),
  ('Qualité rédactionnelle', 'Clarté, structure et orthographe du rapport', 'report', 20.00, 0.30),
  ('Méthodologie', 'Rigueur de la démarche scientifique', 'report', 20.00, 0.30),
  ('Résultats et analyse', 'Pertinence des résultats et qualité de l''analyse', 'report', 20.00, 0.40),
  ('Présentation orale', 'Clarté et qualité de la présentation', 'defense', 20.00, 0.40),
  ('Réponses aux questions', 'Pertinence des réponses du jury', 'defense', 20.00, 0.40),
  ('Maîtrise du sujet', 'Compréhension approfondie du sujet', 'defense', 20.00, 0.20)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- TABLE: final_grades (Notes finales)
-- =====================================================

CREATE TABLE IF NOT EXISTS final_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES thesis_topics(id) ON DELETE CASCADE,
  
  -- Note d'encadrement (40%)
  supervision_grade DECIMAL(4,2) CHECK (supervision_grade BETWEEN 0 AND 20),
  supervision_graded_by UUID REFERENCES profiles(id),
  supervision_graded_at TIMESTAMPTZ,
  
  -- Note du rapport (40%)
  report_grade DECIMAL(4,2) CHECK (report_grade BETWEEN 0 AND 20),
  report_graded_by UUID REFERENCES profiles(id),
  report_graded_at TIMESTAMPTZ,
  
  -- Note de soutenance (20%)
  defense_grade DECIMAL(4,2) CHECK (defense_grade BETWEEN 0 AND 20),
  defense_graded_by UUID REFERENCES profiles(id),
  defense_graded_at TIMESTAMPTZ,
  
  -- Note finale calculée automatiquement
  final_grade DECIMAL(4,2) CHECK (final_grade BETWEEN 0 AND 20),
  mention TEXT CHECK (mention IN ('Passable', 'Assez Bien', 'Bien', 'Très Bien', 'Excellent')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(student_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_final_grades_student ON final_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_final_grades_theme ON final_grades(theme_id);

-- =====================================================
-- TABLE: grade_criteria_details (Détails notes par critère)
-- =====================================================

CREATE TABLE IF NOT EXISTS grade_criteria_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  final_grade_id UUID NOT NULL REFERENCES final_grades(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES evaluation_criteria(id) ON DELETE CASCADE,
  score DECIMAL(4,2) NOT NULL CHECK (score BETWEEN 0 AND 20),
  comments TEXT,
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(final_grade_id, criteria_id)
);

CREATE INDEX IF NOT EXISTS idx_grade_criteria_grade ON grade_criteria_details(final_grade_id);
CREATE INDEX IF NOT EXISTS idx_grade_criteria_criteria ON grade_criteria_details(criteria_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Mettre à jour updated_at
DROP TRIGGER IF EXISTS update_report_submissions_updated_at ON report_submissions;
CREATE TRIGGER update_report_submissions_updated_at 
  BEFORE UPDATE ON report_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_defense_rooms_updated_at ON defense_rooms;
CREATE TRIGGER update_defense_rooms_updated_at 
  BEFORE UPDATE ON defense_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_defense_sessions_updated_at ON defense_sessions;
CREATE TRIGGER update_defense_sessions_updated_at 
  BEFORE UPDATE ON defense_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_defense_minutes_updated_at ON defense_minutes;
CREATE TRIGGER update_defense_minutes_updated_at 
  BEFORE UPDATE ON defense_minutes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_final_grades_updated_at ON final_grades;
CREATE TRIGGER update_final_grades_updated_at 
  BEFORE UPDATE ON final_grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Trigger: Vérifier disponibilité de la salle
-- =====================================================

CREATE OR REPLACE FUNCTION check_room_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier s'il y a un conflit d'horaires
  IF EXISTS (
    SELECT 1 FROM defense_sessions
    WHERE room_id = NEW.room_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND status NOT IN ('cancelled', 'completed')
      AND (
        -- Chevauchement d'horaires
        (NEW.scheduled_date, NEW.scheduled_date + (NEW.duration_minutes || ' minutes')::INTERVAL)
        OVERLAPS
        (scheduled_date, scheduled_date + (duration_minutes || ' minutes')::INTERVAL)
      )
  ) THEN
    RAISE EXCEPTION 'La salle % est déjà réservée pour cette période', NEW.room_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_room_availability ON defense_sessions;
CREATE TRIGGER trigger_check_room_availability
  BEFORE INSERT OR UPDATE ON defense_sessions
  FOR EACH ROW
  EXECUTE FUNCTION check_room_availability();

-- =====================================================
-- Trigger: Calculer la note finale automatiquement
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_final_grade()
RETURNS TRIGGER AS $$
DECLARE
  v_final DECIMAL(4,2);
BEGIN
  -- Calculer la note finale: 40% + 40% + 20%
  IF NEW.supervision_grade IS NOT NULL 
     AND NEW.report_grade IS NOT NULL 
     AND NEW.defense_grade IS NOT NULL THEN
    
    v_final := (NEW.supervision_grade * 0.40) 
             + (NEW.report_grade * 0.40) 
             + (NEW.defense_grade * 0.20);
    
    NEW.final_grade := ROUND(v_final, 2);
    
    -- Déterminer la mention
    NEW.mention := CASE
      WHEN v_final >= 16 THEN 'Excellent'
      WHEN v_final >= 14 THEN 'Très Bien'
      WHEN v_final >= 12 THEN 'Bien'
      WHEN v_final >= 10 THEN 'Assez Bien'
      WHEN v_final >= 8 THEN 'Passable'
      ELSE NULL
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_final_grade ON final_grades;
CREATE TRIGGER trigger_calculate_final_grade
  BEFORE INSERT OR UPDATE ON final_grades
  FOR EACH ROW
  EXECUTE FUNCTION calculate_final_grade();

-- =====================================================
-- Trigger: Générer le PV automatiquement après soutenance
-- =====================================================

CREATE OR REPLACE FUNCTION generate_defense_minutes()
RETURNS TRIGGER AS $$
BEGIN
  -- Générer le PV quand la soutenance est complétée
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO defense_minutes (
      defense_session_id,
      student_id,
      theme_id,
      jury_decision,
      generated_at
    )
    VALUES (
      NEW.id,
      NEW.student_id,
      NEW.theme_id,
      'approved', -- Par défaut, à modifier par le jury
      NOW()
    )
    ON CONFLICT (defense_session_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_defense_minutes ON defense_sessions;
CREATE TRIGGER trigger_generate_defense_minutes
  AFTER UPDATE ON defense_sessions
  FOR EACH ROW
  EXECUTE FUNCTION generate_defense_minutes();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE report_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_jury_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_criteria_details ENABLE ROW LEVEL SECURITY;

-- Policies pour report_submissions
DROP POLICY IF EXISTS "Students can view own submissions" ON report_submissions;
CREATE POLICY "Students can view own submissions"
  ON report_submissions FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can create submissions" ON report_submissions;
CREATE POLICY "Students can create submissions"
  ON report_submissions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Supervisors can view assigned students submissions" ON report_submissions;
CREATE POLICY "Supervisors can view assigned students submissions"
  ON report_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM supervisor_assignments sa
      WHERE sa.student_id = report_submissions.student_id
        AND sa.supervisor_id = auth.uid()
        AND sa.is_active = TRUE
    )
  );

-- Policies pour supervisor_comments
DROP POLICY IF EXISTS "Students can view comments on their submissions" ON supervisor_comments;
CREATE POLICY "Students can view comments on their submissions"
  ON supervisor_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM report_submissions rs
      WHERE rs.id = supervisor_comments.report_submission_id
        AND rs.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Supervisors can create comments" ON supervisor_comments;
CREATE POLICY "Supervisors can create comments"
  ON supervisor_comments FOR INSERT
  TO authenticated
  WITH CHECK (supervisor_id = auth.uid());

-- Policies pour defense_rooms
DROP POLICY IF EXISTS "Everyone can view rooms" ON defense_rooms;
CREATE POLICY "Everyone can view rooms"
  ON defense_rooms FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage rooms" ON defense_rooms;
CREATE POLICY "Admins can manage rooms"
  ON defense_rooms FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'department_head'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'department_head'));

-- Policies pour defense_sessions
DROP POLICY IF EXISTS "Students can view own defense" ON defense_sessions;
CREATE POLICY "Students can view own defense"
  ON defense_sessions FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Jury members can view assigned defenses" ON defense_sessions;
CREATE POLICY "Jury members can view assigned defenses"
  ON defense_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM defense_jury_members djm
      WHERE djm.defense_session_id = defense_sessions.id
        AND djm.jury_member_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Department heads can manage defenses" ON defense_sessions;
CREATE POLICY "Department heads can manage defenses"
  ON defense_sessions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'department_head') OR has_role(auth.uid(), 'admin'));

-- Policies pour defense_minutes
DROP POLICY IF EXISTS "Students can view own minutes" ON defense_minutes;
CREATE POLICY "Students can view own minutes"
  ON defense_minutes FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Jury members can view and update minutes" ON defense_minutes;
CREATE POLICY "Jury members can view and update minutes"
  ON defense_minutes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM defense_jury_members djm
      WHERE djm.defense_session_id = defense_minutes.defense_session_id
        AND djm.jury_member_id = auth.uid()
    )
  );

-- Policies pour final_grades
DROP POLICY IF EXISTS "Students can view own grades" ON final_grades;
CREATE POLICY "Students can view own grades"
  ON final_grades FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Supervisors can manage supervision grades" ON final_grades;
CREATE POLICY "Supervisors can manage supervision grades"
  ON final_grades FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM supervisor_assignments sa
      WHERE sa.student_id = final_grades.student_id
        AND sa.supervisor_id = auth.uid()
        AND sa.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "Department heads can manage all grades" ON final_grades;
CREATE POLICY "Department heads can manage all grades"
  ON final_grades FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'department_head') OR has_role(auth.uid(), 'admin'));

-- =====================================================
-- VUES UTILES
-- =====================================================

-- Vue: Planning des soutenances
CREATE OR REPLACE VIEW defense_schedule AS
SELECT 
  ds.id as defense_id,
  ds.scheduled_date,
  ds.duration_minutes,
  ds.status,
  dr.name as room_name,
  dr.location as room_location,
  p.first_name || ' ' || p.last_name as student_name,
  p.matricule as student_matricule,
  tt.title as thesis_title,
  d.name as department_name,
  ARRAY_AGG(
    pj.first_name || ' ' || pj.last_name || ' (' || djm.role || ')'
  ) as jury_members
FROM defense_sessions ds
JOIN defense_rooms dr ON dr.id = ds.room_id
JOIN profiles p ON p.id = ds.student_id
JOIN thesis_topics tt ON tt.id = ds.theme_id
JOIN departments d ON d.id = ds.department_id
LEFT JOIN defense_jury_members djm ON djm.defense_session_id = ds.id
LEFT JOIN profiles pj ON pj.id = djm.jury_member_id
GROUP BY ds.id, ds.scheduled_date, ds.duration_minutes, ds.status,
         dr.name, dr.location, p.first_name, p.last_name, p.matricule,
         tt.title, d.name
ORDER BY ds.scheduled_date;

-- Vue: Statistiques de plagiat par département
CREATE OR REPLACE VIEW plagiarism_statistics AS
SELECT 
  d.name as department_name,
  COUNT(DISTINCT pr.id) as total_checks,
  AVG(pr.plagiarism_score) as avg_plagiarism_score,
  COUNT(CASE WHEN pr.passed = FALSE THEN 1 END) as failed_checks,
  COUNT(CASE WHEN pr.passed = TRUE THEN 1 END) as passed_checks
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
LEFT JOIN report_submissions rs ON rs.student_id = p.id
LEFT JOIN plagiarism_reports pr ON pr.id = rs.plagiarism_report_id
GROUP BY d.id, d.name
ORDER BY d.name;

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE report_submissions IS 'Dépôts de rapports par les étudiants (plusieurs versions possibles)';
COMMENT ON TABLE supervisor_comments IS 'Commentaires des encadreurs sur les rapports';
COMMENT ON TABLE defense_rooms IS 'Salles disponibles pour les soutenances';
COMMENT ON TABLE defense_sessions IS 'Séances de soutenance (une par étudiant)';
COMMENT ON TABLE defense_jury_members IS 'Membres du jury pour chaque soutenance';
COMMENT ON TABLE defense_minutes IS 'PV de soutenance (un par soutenance)';
COMMENT ON TABLE evaluation_criteria IS 'Critères d''évaluation (encadrement, rapport, soutenance)';
COMMENT ON TABLE final_grades IS 'Notes finales des étudiants (calculées automatiquement)';
COMMENT ON TABLE grade_criteria_details IS 'Détails des notes par critère d''évaluation';
