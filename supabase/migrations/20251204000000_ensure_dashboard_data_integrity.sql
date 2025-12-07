-- Migration pour assurer l'intégrité des données des dashboards
-- Date: 2024-12-04
-- Description: Vérification et correction des colonnes nécessaires pour les dashboards

-- Vérifier que la colonne overall_progress existe dans fiche_suivi
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fiche_suivi' AND column_name = 'overall_progress'
  ) THEN
    ALTER TABLE fiche_suivi ADD COLUMN overall_progress INTEGER DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100);
  END IF;
END $$;

-- Vérifier que la colonne validation_status existe dans fiche_suivi
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fiche_suivi' AND column_name = 'validation_status'
  ) THEN
    ALTER TABLE fiche_suivi ADD COLUMN validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Vérifier que la colonne is_read existe dans alerts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE alerts ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Vérifier que la colonne is_read existe dans messages
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Vérifier que la colonne similarity_score existe dans plagiarism_reports
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plagiarism_reports' AND column_name = 'similarity_score'
  ) THEN
    ALTER TABLE plagiarism_reports ADD COLUMN similarity_score NUMERIC(5,2) CHECK (similarity_score >= 0 AND similarity_score <= 100);
  END IF;
END $$;

-- Vérifier que la colonne is_active existe dans supervisor_assignments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supervisor_assignments' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE supervisor_assignments ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Créer des index pour améliorer les performances des requêtes dashboard
CREATE INDEX IF NOT EXISTS idx_fiche_suivi_student_id ON fiche_suivi(student_id);
CREATE INDEX IF NOT EXISTS idx_fiche_suivi_validation_status ON fiche_suivi(validation_status);
CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_meetings_student_id ON meetings(student_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id_is_read ON alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id_is_read ON messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_themes_student_id ON themes(student_id);
CREATE INDEX IF NOT EXISTS idx_themes_supervisor_id ON themes(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_themes_status ON themes(status);
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor_id ON supervisor_assignments(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_student_id ON supervisor_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_is_active ON supervisor_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_defenses_status ON defenses(status);
CREATE INDEX IF NOT EXISTS idx_jury_members_member_id ON jury_members(member_id);
CREATE INDEX IF NOT EXISTS idx_jury_decisions_theme_id ON jury_decisions(theme_id);

-- Commentaires pour documentation
COMMENT ON COLUMN fiche_suivi.overall_progress IS 'Progression globale du mémoire (0-100%)';
COMMENT ON COLUMN fiche_suivi.validation_status IS 'Statut de validation par le chef de département';
COMMENT ON COLUMN alerts.is_read IS 'Indique si l''alerte a été lue';
COMMENT ON COLUMN messages.is_read IS 'Indique si le message a été lu';
COMMENT ON COLUMN plagiarism_reports.similarity_score IS 'Score de similarité du plagiat (0-100%)';
COMMENT ON COLUMN supervisor_assignments.is_active IS 'Indique si l''attribution est active';
