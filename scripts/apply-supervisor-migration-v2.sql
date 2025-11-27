-- =====================================================
-- APPLICATION DE LA MIGRATION - Interface Encadreur V2
-- =====================================================
-- Compatible avec themes OU thesis_topics

-- Déterminer quelle table utiliser
DO $$
DECLARE
  theme_table_name TEXT;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'thesis_topics') THEN
    theme_table_name := 'thesis_topics';
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'themes') THEN
    theme_table_name := 'themes';
  ELSE
    RAISE EXCEPTION 'Aucune table de thèmes trouvée (themes ou thesis_topics)';
  END IF;
  
  RAISE NOTICE 'Utilisation de la table: %', theme_table_name;
END $$;

-- =====================================================
-- TABLES
-- =====================================================

-- Table pour les rencontres encadreur-étudiant
CREATE TABLE IF NOT EXISTS supervisor_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID NOT NULL, -- Référence ajoutée après
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  meeting_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  
  objectives TEXT NOT NULL,
  work_completed TEXT,
  chapters_discussed TEXT,
  corrections_needed TEXT,
  problems_encountered TEXT,
  recommendations TEXT NOT NULL,
  
  status TEXT DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Ajouter la contrainte de clé étrangère selon la table qui existe
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'thesis_topics') THEN
    ALTER TABLE supervisor_meetings DROP CONSTRAINT IF EXISTS supervisor_meetings_theme_id_fkey;
    ALTER TABLE supervisor_meetings ADD CONSTRAINT supervisor_meetings_theme_id_fkey 
      FOREIGN KEY (theme_id) REFERENCES thesis_topics(id) ON DELETE CASCADE;
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'themes') THEN
    ALTER TABLE supervisor_meetings DROP CONSTRAINT IF EXISTS supervisor_meetings_theme_id_fkey;
    ALTER TABLE supervisor_meetings ADD CONSTRAINT supervisor_meetings_theme_id_fkey 
      FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supervisor_meetings_theme ON supervisor_meetings(theme_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_meetings_student ON supervisor_meetings(student_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_meetings_supervisor ON supervisor_meetings(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_meetings_date ON supervisor_meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_supervisor_meetings_status ON supervisor_meetings(status);

-- Table pour les évaluations intermédiaires
CREATE TABLE IF NOT EXISTS intermediate_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  evaluation_date TIMESTAMPTZ DEFAULT NOW(),
  evaluation_type TEXT NOT NULL,
  
  content_quality INTEGER CHECK (content_quality BETWEEN 1 AND 5),
  methodology_quality INTEGER CHECK (methodology_quality BETWEEN 1 AND 5),
  writing_quality INTEGER CHECK (writing_quality BETWEEN 1 AND 5),
  research_depth INTEGER CHECK (research_depth BETWEEN 1 AND 5),
  autonomy_level INTEGER CHECK (autonomy_level BETWEEN 1 AND 5),
  respect_deadlines INTEGER CHECK (respect_deadlines BETWEEN 1 AND 5),
  
  overall_score DECIMAL(4,2),
  strengths TEXT,
  weaknesses TEXT,
  recommendations TEXT,
  
  visible_to_student BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'thesis_topics') THEN
    ALTER TABLE intermediate_evaluations DROP CONSTRAINT IF EXISTS intermediate_evaluations_theme_id_fkey;
    ALTER TABLE intermediate_evaluations ADD CONSTRAINT intermediate_evaluations_theme_id_fkey 
      FOREIGN KEY (theme_id) REFERENCES thesis_topics(id) ON DELETE CASCADE;
  ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'themes') THEN
    ALTER TABLE intermediate_evaluations DROP CONSTRAINT IF EXISTS intermediate_evaluations_theme_id_fkey;
    ALTER TABLE intermediate_evaluations ADD CONSTRAINT intermediate_evaluations_theme_id_fkey 
      FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_intermediate_evaluations_theme ON intermediate_evaluations(theme_id);
CREATE INDEX IF NOT EXISTS idx_intermediate_evaluations_student ON intermediate_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_intermediate_evaluations_supervisor ON intermediate_evaluations(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_intermediate_evaluations_date ON intermediate_evaluations(evaluation_date DESC);

-- Table pour les commentaires sur les documents
CREATE TABLE IF NOT EXISTS document_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  comment_text TEXT NOT NULL,
  page_number INTEGER,
  section_reference TEXT,
  
  comment_type TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal',
  
  visible_to_student BOOLEAN DEFAULT TRUE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_comments_document ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_author ON document_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_type ON document_comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_document_comments_resolved ON document_comments(is_resolved);

-- Table pour la messagerie interne
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  
  related_entity_type TEXT,
  related_entity_id UUID,
  
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  archived_by_sender BOOLEAN DEFAULT FALSE,
  archived_by_recipient BOOLEAN DEFAULT FALSE,
  
  attachments JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Table pour les alertes automatiques
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  related_entity_type TEXT,
  related_entity_id UUID,
  
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_dismissed ON alerts(dismissed);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_supervisor_meetings_updated_at ON supervisor_meetings;
CREATE TRIGGER update_supervisor_meetings_updated_at BEFORE UPDATE ON supervisor_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_intermediate_evaluations_updated_at ON intermediate_evaluations;
CREATE TRIGGER update_intermediate_evaluations_updated_at BEFORE UPDATE ON intermediate_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_comments_updated_at ON document_comments;
CREATE TRIGGER update_document_comments_updated_at BEFORE UPDATE ON document_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FONCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION create_alert(
  p_user_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_message TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO alerts (
    user_id, alert_type, severity, title, message,
    related_entity_type, related_entity_id, expires_at
  )
  VALUES (
    p_user_id, p_alert_type, p_severity, p_title, p_message,
    p_entity_type, p_entity_id, p_expires_at
  )
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction stats compatible avec les deux tables
CREATE OR REPLACE FUNCTION get_supervisor_stats(p_supervisor_id UUID)
RETURNS TABLE (
  total_students BIGINT,
  pending_themes BIGINT,
  approved_themes BIGINT,
  documents_to_review BIGINT,
  pending_meetings BIGINT,
  alerts_count BIGINT
) AS $$
DECLARE
  theme_table TEXT;
BEGIN
  -- Déterminer quelle table utiliser
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'thesis_topics') THEN
    theme_table := 'thesis_topics';
  ELSE
    theme_table := 'themes';
  END IF;

  RETURN QUERY EXECUTE format('
    SELECT
      COUNT(DISTINCT sa.student_id) as total_students,
      COUNT(DISTINCT CASE WHEN t.status IN (''pending'', ''revision_requested'') THEN t.id END) as pending_themes,
      COUNT(DISTINCT CASE WHEN t.status = ''approved'' THEN t.id END) as approved_themes,
      COUNT(DISTINCT CASE WHEN d.status = ''submitted'' THEN d.id END) as documents_to_review,
      COUNT(DISTINCT CASE WHEN sm.status = ''submitted'' THEN sm.id END) as pending_meetings,
      COUNT(DISTINCT CASE WHEN a.dismissed = FALSE AND a.acknowledged = FALSE THEN a.id END) as alerts_count
    FROM supervisor_assignments sa
    LEFT JOIN %I t ON t.student_id = sa.student_id AND t.supervisor_id = $1
    LEFT JOIN documents d ON d.theme_id = t.id
    LEFT JOIN supervisor_meetings sm ON sm.supervisor_id = $1
    LEFT JOIN alerts a ON a.user_id = $1
    WHERE sa.supervisor_id = $1 AND sa.is_active = TRUE
  ', theme_table) USING p_supervisor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE supervisor_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE intermediate_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supervisors can view their meetings" ON supervisor_meetings;
CREATE POLICY "Supervisors can view their meetings"
  ON supervisor_meetings FOR SELECT
  USING (auth.uid() = supervisor_id);

DROP POLICY IF EXISTS "Students can view their meetings" ON supervisor_meetings;
CREATE POLICY "Students can view their meetings"
  ON supervisor_meetings FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Supervisors can create meetings" ON supervisor_meetings;
CREATE POLICY "Supervisors can create meetings"
  ON supervisor_meetings FOR INSERT
  WITH CHECK (auth.uid() = supervisor_id);

DROP POLICY IF EXISTS "Supervisors can update their meetings" ON supervisor_meetings;
CREATE POLICY "Supervisors can update their meetings"
  ON supervisor_meetings FOR UPDATE
  USING (auth.uid() = supervisor_id);

DROP POLICY IF EXISTS "Supervisors can manage their evaluations" ON intermediate_evaluations;
CREATE POLICY "Supervisors can manage their evaluations"
  ON intermediate_evaluations FOR ALL
  USING (auth.uid() = supervisor_id);

DROP POLICY IF EXISTS "Students can view their evaluations when visible" ON intermediate_evaluations;
CREATE POLICY "Students can view their evaluations when visible"
  ON intermediate_evaluations FOR SELECT
  USING (auth.uid() = student_id AND visible_to_student = TRUE);

DROP POLICY IF EXISTS "Authors can manage their comments" ON document_comments;
CREATE POLICY "Authors can manage their comments"
  ON document_comments FOR ALL
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Students can view comments on their documents" ON document_comments;
CREATE POLICY "Students can view comments on their documents"
  ON document_comments FOR SELECT
  USING (
    visible_to_student = TRUE AND
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_comments.document_id
      AND d.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view their messages" ON messages;
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update their messages" ON messages;
CREATE POLICY "Users can update their messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can view their alerts" ON alerts;
CREATE POLICY "Users can view their alerts"
  ON alerts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their alerts" ON alerts;
CREATE POLICY "Users can update their alerts"
  ON alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- VUES
-- =====================================================

-- Vue compatible avec les deux tables
DO $$
DECLARE
  theme_table TEXT;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'thesis_topics') THEN
    theme_table := 'thesis_topics';
  ELSE
    theme_table := 'themes';
  END IF;

  EXECUTE format('
    CREATE OR REPLACE VIEW supervisor_students_overview AS
    SELECT 
      sa.supervisor_id,
      p.id as student_id,
      p.first_name,
      p.last_name,
      p.email,
      p.student_id as matricule,
      d.name as department_name,
      t.id as theme_id,
      t.title as theme_title,
      t.status as theme_status,
      fs.overall_progress,
      fs.supervisor_validated,
      COUNT(DISTINCT doc.id) FILTER (WHERE doc.status = ''submitted'') as pending_documents,
      COUNT(DISTINCT sm.id) FILTER (WHERE sm.status = ''submitted'') as pending_meetings,
      MAX(sm.meeting_date) as last_meeting_date,
      sa.assigned_at,
      sa.notes as assignment_notes
    FROM supervisor_assignments sa
    JOIN profiles p ON p.id = sa.student_id
    LEFT JOIN departments d ON d.id = p.department_id
    LEFT JOIN %I t ON t.student_id = p.id AND t.supervisor_id = sa.supervisor_id
    LEFT JOIN fiche_suivi fs ON fs.theme_id = t.id
    LEFT JOIN documents doc ON doc.theme_id = t.id
    LEFT JOIN supervisor_meetings sm ON sm.theme_id = t.id
    WHERE sa.is_active = TRUE
    GROUP BY sa.supervisor_id, p.id, p.first_name, p.last_name, p.email, p.student_id,
             d.name, t.id, t.title, t.status, fs.overall_progress, fs.supervisor_validated,
             sa.assigned_at, sa.notes
  ', theme_table);
END $$;

-- Migration terminée
