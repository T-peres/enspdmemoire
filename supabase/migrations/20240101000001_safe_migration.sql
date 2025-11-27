-- =====================================================
-- MIGRATION SÉCURISÉE - GESTION DES ÉLÉMENTS EXISTANTS
-- =====================================================
-- Cette version vérifie si les éléments existent avant de les créer
-- Utilisez ce fichier si vous obtenez des erreurs "already exists"
-- =====================================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TYPES ÉNUMÉRÉS (avec vérification)
-- =====================================================

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('student', 'supervisor', 'department_head', 'jury', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE theme_status AS ENUM ('pending', 'approved', 'rejected', 'revision_requested');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('plan', 'chapter_1', 'chapter_2', 'chapter_3', 'chapter_4', 'final_version');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'revision_requested');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE plagiarism_status AS ENUM ('pending', 'in_progress', 'passed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE jury_decision AS ENUM ('pending', 'approved', 'corrections_required', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE archive_status AS ENUM ('pending', 'archived', 'published');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLE: departments (Départements de l'ENSPD)
-- =====================================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);

-- Insérer les départements de l'ENSPD (avec ON CONFLICT)
INSERT INTO departments (code, name, description) VALUES
  ('GIT', 'Génie Informatique & Télécommunications', 'Formation en informatique, réseaux et télécommunications'),
  ('GESI', 'Génie Électrique et Systèmes Intelligents', 'Formation en électricité, électronique et systèmes intelligents'),
  ('GQHSE', 'Génie de la Qualité Hygiène Sécurité et Environnement', 'Formation en qualité, hygiène, sécurité et environnement'),
  ('GAM', 'Génie Automobile et Mécatronique', 'Formation en automobile et mécatronique'),
  ('GMP', 'Génie Maritime et Portuaire', 'Formation en ingénierie maritime et portuaire'),
  ('GP', 'Génie des Procédés', 'Formation en génie des procédés industriels'),
  ('GE', 'Génie Énergétique', 'Formation en énergies et systèmes énergétiques'),
  ('GM', 'Génie Mécanique', 'Formation en mécanique et conception'),
  ('GPH', 'Génie Physique', 'Formation en physique appliquée'),
  ('GC', 'Génie Civil', 'Formation en génie civil et construction')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- TABLE: profiles (extension de auth.users)
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  department_id UUID REFERENCES departments(id),
  student_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department_id);

-- =====================================================
-- TABLE: user_roles
-- =====================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- =====================================================
-- TABLE: supervisor_assignments
-- =====================================================

CREATE TABLE IF NOT EXISTS supervisor_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  UNIQUE(student_id, is_active)
);

CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_student ON supervisor_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor ON supervisor_assignments(supervisor_id);

-- =====================================================
-- TABLE: themes
-- =====================================================

CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  objectives TEXT,
  methodology TEXT,
  status theme_status DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  revision_notes TEXT,
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES themes(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_themes_student ON themes(student_id);
CREATE INDEX IF NOT EXISTS idx_themes_supervisor ON themes(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_themes_status ON themes(status);

-- =====================================================
-- TABLE: documents
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  document_type document_type NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  status document_status DEFAULT 'submitted',
  version INTEGER DEFAULT 1,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_theme ON documents(theme_id);
CREATE INDEX IF NOT EXISTS idx_documents_student ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- =====================================================
-- TABLE: fiche_suivi
-- =====================================================

CREATE TABLE IF NOT EXISTS fiche_suivi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  supervisor_id UUID NOT NULL REFERENCES profiles(id),
  
  plan_submitted BOOLEAN DEFAULT FALSE,
  plan_approved BOOLEAN DEFAULT FALSE,
  plan_comments TEXT,
  plan_date TIMESTAMPTZ,
  
  chapter_1_progress INTEGER DEFAULT 0,
  chapter_1_comments TEXT,
  chapter_1_date TIMESTAMPTZ,
  
  chapter_2_progress INTEGER DEFAULT 0,
  chapter_2_comments TEXT,
  chapter_2_date TIMESTAMPTZ,
  
  chapter_3_progress INTEGER DEFAULT 0,
  chapter_3_comments TEXT,
  chapter_3_date TIMESTAMPTZ,
  
  chapter_4_progress INTEGER DEFAULT 0,
  chapter_4_comments TEXT,
  chapter_4_date TIMESTAMPTZ,
  
  overall_progress INTEGER DEFAULT 0,
  quality_rating INTEGER,
  methodology_rating INTEGER,
  writing_quality_rating INTEGER,
  
  supervisor_validated BOOLEAN DEFAULT FALSE,
  supervisor_validation_date TIMESTAMPTZ,
  department_head_validated BOOLEAN DEFAULT FALSE,
  department_head_validation_date TIMESTAMPTZ,
  department_head_comments TEXT,
  
  last_updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(theme_id)
);

CREATE INDEX IF NOT EXISTS idx_fiche_suivi_theme ON fiche_suivi(theme_id);
CREATE INDEX IF NOT EXISTS idx_fiche_suivi_student ON fiche_suivi(student_id);
CREATE INDEX IF NOT EXISTS idx_fiche_suivi_supervisor ON fiche_suivi(supervisor_id);

-- =====================================================
-- TABLE: plagiarism_reports
-- =====================================================

CREATE TABLE IF NOT EXISTS plagiarism_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  
  plagiarism_score DECIMAL(5,2),
  status plagiarism_status DEFAULT 'pending',
  report_file_path TEXT,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES profiles(id),
  
  sources_found INTEGER DEFAULT 0,
  details JSONB,
  
  threshold_used DECIMAL(5,2) DEFAULT 20.00,
  passed BOOLEAN,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_document ON plagiarism_reports(document_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_theme ON plagiarism_reports(theme_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_status ON plagiarism_reports(status);

-- =====================================================
-- TABLE: jury_members
-- =====================================================

CREATE TABLE IF NOT EXISTS jury_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  UNIQUE(theme_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_jury_members_theme ON jury_members(theme_id);
CREATE INDEX IF NOT EXISTS idx_jury_members_member ON jury_members(member_id);

-- =====================================================
-- TABLE: jury_decisions
-- =====================================================

CREATE TABLE IF NOT EXISTS jury_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  
  defense_date TIMESTAMPTZ,
  decision jury_decision DEFAULT 'pending',
  grade DECIMAL(4,2),
  mention TEXT,
  
  corrections_required BOOLEAN DEFAULT FALSE,
  corrections_deadline TIMESTAMPTZ,
  corrections_description TEXT,
  corrections_completed BOOLEAN DEFAULT FALSE,
  corrections_validated_at TIMESTAMPTZ,
  corrections_validated_by UUID REFERENCES profiles(id),
  
  deliberation_notes TEXT,
  decided_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(theme_id)
);

CREATE INDEX IF NOT EXISTS idx_jury_decisions_theme ON jury_decisions(theme_id);
CREATE INDEX IF NOT EXISTS idx_jury_decisions_student ON jury_decisions(student_id);
CREATE INDEX IF NOT EXISTS idx_jury_decisions_decision ON jury_decisions(decision);

-- =====================================================
-- TABLE: archives
-- =====================================================

CREATE TABLE IF NOT EXISTS archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),
  
  final_document_path TEXT NOT NULL,
  pdf_a_path TEXT,
  file_size BIGINT,
  checksum TEXT,
  
  status archive_status DEFAULT 'pending',
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES profiles(id),
  
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  access_level TEXT DEFAULT 'restricted',
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(theme_id)
);

CREATE INDEX IF NOT EXISTS idx_archives_theme ON archives(theme_id);
CREATE INDEX IF NOT EXISTS idx_archives_student ON archives(student_id);
CREATE INDEX IF NOT EXISTS idx_archives_status ON archives(status);

-- =====================================================
-- TABLE: notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- TABLE: activity_logs
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- =====================================================
-- TABLE: system_settings
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Insérer les paramètres par défaut
INSERT INTO system_settings (key, value, description) VALUES
  ('plagiarism_threshold', '20.0', 'Seuil de plagiat en pourcentage'),
  ('correction_deadline_days', '30', 'Délai pour corrections post-soutenance (jours)'),
  ('email_notifications_enabled', 'true', 'Activer les notifications email'),
  ('max_file_size_mb', '50', 'Taille maximale des fichiers en MB')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- FONCTIONS ET TRIGGERS
-- =====================================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les triggers existants avant de les recréer
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_themes_updated_at ON themes;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_fiche_suivi_updated_at ON fiche_suivi;
DROP TRIGGER IF EXISTS update_plagiarism_reports_updated_at ON plagiarism_reports;
DROP TRIGGER IF EXISTS update_jury_decisions_updated_at ON jury_decisions;
DROP TRIGGER IF EXISTS update_archives_updated_at ON archives;

-- Créer les triggers
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_themes_updated_at BEFORE UPDATE ON themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fiche_suivi_updated_at BEFORE UPDATE ON fiche_suivi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plagiarism_reports_updated_at BEFORE UPDATE ON plagiarism_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jury_decisions_updated_at BEFORE UPDATE ON jury_decisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_archives_updated_at BEFORE UPDATE ON archives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour créer une fiche de suivi automatiquement
CREATE OR REPLACE FUNCTION create_fiche_suivi_on_theme_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO fiche_suivi (theme_id, student_id, supervisor_id)
    VALUES (NEW.id, NEW.student_id, NEW.supervisor_id)
    ON CONFLICT (theme_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_fiche_suivi ON themes;

CREATE TRIGGER trigger_create_fiche_suivi
  AFTER UPDATE ON themes
  FOR EACH ROW
  EXECUTE FUNCTION create_fiche_suivi_on_theme_approval();

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_entity_type, p_entity_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiche_suivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE jury_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE jury_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes
DROP POLICY IF EXISTS "Everyone can view departments" ON departments;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Students can view their own themes" ON themes;
DROP POLICY IF EXISTS "Supervisors can view assigned themes" ON themes;
DROP POLICY IF EXISTS "Students can create themes" ON themes;
DROP POLICY IF EXISTS "Students can view their own documents" ON documents;
DROP POLICY IF EXISTS "Students can create documents" ON documents;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Créer les policies
CREATE POLICY "Everyone can view departments"
  ON departments FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can view their own themes"
  ON themes FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Supervisors can view assigned themes"
  ON themes FOR SELECT
  USING (auth.uid() = supervisor_id);

CREATE POLICY "Students can create themes"
  ON themes FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- VUES UTILES
-- =====================================================

CREATE OR REPLACE VIEW student_progress AS
SELECT 
  p.id as student_id,
  p.first_name,
  p.last_name,
  p.email,
  t.id as theme_id,
  t.title as theme_title,
  t.status as theme_status,
  fs.overall_progress,
  fs.supervisor_validated,
  fs.department_head_validated,
  sa.supervisor_id,
  ps.first_name as supervisor_first_name,
  ps.last_name as supervisor_last_name
FROM profiles p
LEFT JOIN themes t ON t.student_id = p.id AND t.status = 'approved'
LEFT JOIN fiche_suivi fs ON fs.theme_id = t.id
LEFT JOIN supervisor_assignments sa ON sa.student_id = p.id AND sa.is_active = TRUE
LEFT JOIN profiles ps ON ps.id = sa.supervisor_id
WHERE EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'student');

-- =====================================================
-- VÉRIFICATION FINALE
-- =====================================================

-- Afficher un résumé
SELECT 
  'Départements' as element,
  COUNT(*) as count
FROM departments

UNION ALL

SELECT 
  'Tables' as element,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public'

UNION ALL

SELECT 
  'Types énumérés' as element,
  COUNT(*) as count
FROM pg_type 
WHERE typname IN ('app_role', 'theme_status', 'document_type', 'document_status', 'plagiarism_status', 'jury_decision', 'archive_status');

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Migration sécurisée terminée avec succès !';
  RAISE NOTICE '✅ 10 départements de l''ENSPD créés';
  RAISE NOTICE '✅ 14 tables créées';
  RAISE NOTICE '✅ Système prêt à l''emploi';
END $$;
