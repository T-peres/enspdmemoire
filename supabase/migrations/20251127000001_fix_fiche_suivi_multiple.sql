-- =====================================================
-- MIGRATION: Corriger fiche_suivi pour plusieurs fiches
-- Date: 2025-11-27
-- Description: Permet plusieurs fiches de suivi par thème
-- =====================================================

-- 1. Supprimer la contrainte UNIQUE(theme_id)
ALTER TABLE fiche_suivi 
  DROP CONSTRAINT IF EXISTS fiche_suivi_theme_id_key;

-- 2. Ajouter les colonnes pour différencier les fiches
ALTER TABLE fiche_suivi 
  ADD COLUMN IF NOT EXISTS meeting_number INTEGER DEFAULT 1;

ALTER TABLE fiche_suivi 
  ADD COLUMN IF NOT EXISTS meeting_date TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE fiche_suivi 
  ADD COLUMN IF NOT EXISTS meeting_duration INTEGER DEFAULT 60; -- en minutes

ALTER TABLE fiche_suivi 
  ADD COLUMN IF NOT EXISTS meeting_location TEXT;

-- 3. Ajouter une nouvelle contrainte pour l'unicité
ALTER TABLE fiche_suivi 
  ADD CONSTRAINT unique_fiche_meeting 
  UNIQUE(theme_id, meeting_number);

-- 4. Créer un index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_fiche_suivi_theme_meeting 
  ON fiche_suivi(theme_id, meeting_number);

-- 5. Créer une fonction pour obtenir le prochain numéro de rencontre
CREATE OR REPLACE FUNCTION get_next_meeting_number(p_theme_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(meeting_number), 0) + 1
  INTO v_next_number
  FROM fiche_suivi
  WHERE theme_id = p_theme_id;
  
  RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

-- 6. Créer un trigger pour auto-incrémenter meeting_number
CREATE OR REPLACE FUNCTION auto_increment_meeting_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.meeting_number IS NULL OR NEW.meeting_number = 1 THEN
    NEW.meeting_number := get_next_meeting_number(NEW.theme_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_increment_meeting_number ON fiche_suivi;
CREATE TRIGGER trigger_auto_increment_meeting_number
  BEFORE INSERT ON fiche_suivi
  FOR EACH ROW
  EXECUTE FUNCTION auto_increment_meeting_number();

-- 7. Mettre à jour les fiches existantes
UPDATE fiche_suivi 
SET meeting_number = 1 
WHERE meeting_number IS NULL;

-- 8. Créer une vue pour faciliter l'affichage
CREATE OR REPLACE VIEW fiche_suivi_complete AS
SELECT 
  fs.*,
  p_student.first_name as student_first_name,
  p_student.last_name as student_last_name,
  p_student.email as student_email,
  p_supervisor.first_name as supervisor_first_name,
  p_supervisor.last_name as supervisor_last_name,
  tt.title as theme_title,
  tt.status as theme_status
FROM fiche_suivi fs
JOIN profiles p_student ON p_student.id = fs.student_id
JOIN profiles p_supervisor ON p_supervisor.id = fs.supervisor_id
LEFT JOIN thesis_topics tt ON tt.id = fs.theme_id
ORDER BY fs.theme_id, fs.meeting_number DESC;

-- 9. Ajouter des commentaires
COMMENT ON COLUMN fiche_suivi.meeting_number IS 'Numéro séquentiel de la rencontre (1, 2, 3, ...)';
COMMENT ON COLUMN fiche_suivi.meeting_date IS 'Date et heure de la rencontre';
COMMENT ON COLUMN fiche_suivi.meeting_duration IS 'Durée de la rencontre en minutes';
COMMENT ON COLUMN fiche_suivi.meeting_location IS 'Lieu de la rencontre (bureau, salle, en ligne)';

-- 10. Créer une fonction pour obtenir toutes les fiches d'un étudiant
CREATE OR REPLACE FUNCTION get_student_fiches_suivi(p_student_id UUID)
RETURNS TABLE (
  id UUID,
  meeting_number INTEGER,
  meeting_date TIMESTAMPTZ,
  overall_progress INTEGER,
  supervisor_validated BOOLEAN,
  department_head_validated BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fs.id,
    fs.meeting_number,
    fs.meeting_date,
    fs.overall_progress,
    fs.supervisor_validated,
    fs.department_head_validated
  FROM fiche_suivi fs
  WHERE fs.student_id = p_student_id
  ORDER BY fs.meeting_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Mettre à jour les politiques RLS pour la nouvelle vue
ALTER TABLE fiche_suivi ENABLE ROW LEVEL SECURITY;

-- Les politiques existantes continuent de fonctionner
-- Ajouter une policy pour la vue si nécessaire

COMMENT ON TABLE fiche_suivi IS 'Fiches de suivi des rencontres encadreur-étudiant (plusieurs par thème)';
COMMENT ON VIEW fiche_suivi_complete IS 'Vue complète des fiches de suivi avec informations étudiant/encadreur';
