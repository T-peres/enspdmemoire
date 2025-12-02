-- =====================================================
-- Migration: Création de l'historique des fiches de suivi
-- Description: Traçabilité complète des modifications des fiches
-- Date: 2025-12-01
-- =====================================================

-- Création de la table d'historique
CREATE TABLE IF NOT EXISTS fiche_suivi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_suivi_id UUID NOT NULL REFERENCES fiche_suivi(id) ON DELETE CASCADE,
  
  -- Snapshot des données au moment de la modification
  snapshot JSONB NOT NULL,
  
  -- Informations sur la modification
  changed_by UUID NOT NULL REFERENCES profiles(id),
  change_type TEXT NOT NULL CHECK (change_type IN (
    'created',
    'updated',
    'supervisor_validated',
    'department_head_validated',
    'supervisor_rejected',
    'department_head_rejected'
  )),
  
  -- Détails des changements
  changed_fields TEXT[],
  change_description TEXT,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_fiche_suivi_history_fiche ON fiche_suivi_history(fiche_suivi_id);
CREATE INDEX idx_fiche_suivi_history_changed_by ON fiche_suivi_history(changed_by);
CREATE INDEX idx_fiche_suivi_history_created_at ON fiche_suivi_history(created_at DESC);
CREATE INDEX idx_fiche_suivi_history_change_type ON fiche_suivi_history(change_type);

-- Commentaires
COMMENT ON TABLE fiche_suivi_history IS 'Historique complet des modifications des fiches de suivi';
COMMENT ON COLUMN fiche_suivi_history.snapshot IS 'Snapshot JSON de la fiche au moment de la modification';
COMMENT ON COLUMN fiche_suivi_history.changed_fields IS 'Liste des champs modifiés';

-- Fonction pour capturer les changements
CREATE OR REPLACE FUNCTION capture_fiche_suivi_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[] := ARRAY[]::TEXT[];
  v_change_type TEXT;
  v_change_description TEXT;
BEGIN
  -- Déterminer le type de changement
  IF TG_OP = 'INSERT' THEN
    v_change_type := 'created';
    v_change_description := 'Fiche de suivi créée';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Identifier les champs modifiés
    IF OLD.work_done != NEW.work_done THEN
      v_changed_fields := array_append(v_changed_fields, 'work_done');
    END IF;
    IF OLD.problems_encountered != NEW.problems_encountered THEN
      v_changed_fields := array_append(v_changed_fields, 'problems_encountered');
    END IF;
    IF OLD.recommendations != NEW.recommendations THEN
      v_changed_fields := array_append(v_changed_fields, 'recommendations');
    END IF;
    IF OLD.next_steps != NEW.next_steps THEN
      v_changed_fields := array_append(v_changed_fields, 'next_steps');
    END IF;
    IF OLD.progress_percentage != NEW.progress_percentage THEN
      v_changed_fields := array_append(v_changed_fields, 'progress_percentage');
    END IF;
    
    -- Déterminer le type de changement spécifique
    IF NEW.supervisor_validated = TRUE AND OLD.supervisor_validated = FALSE THEN
      v_change_type := 'supervisor_validated';
      v_change_description := 'Fiche validée par l''encadreur';
    ELSIF NEW.department_head_validated = TRUE AND OLD.department_head_validated = FALSE THEN
      v_change_type := 'department_head_validated';
      v_change_description := 'Fiche validée par le chef de département';
    ELSIF NEW.supervisor_validated = FALSE AND OLD.supervisor_validated = TRUE THEN
      v_change_type := 'supervisor_rejected';
      v_change_description := 'Validation encadreur retirée';
    ELSIF NEW.department_head_validated = FALSE AND OLD.department_head_validated = TRUE THEN
      v_change_type := 'department_head_rejected';
      v_change_description := 'Validation chef de département retirée';
    ELSE
      v_change_type := 'updated';
      v_change_description := 'Fiche mise à jour: ' || array_to_string(v_changed_fields, ', ');
    END IF;
  END IF;
  
  -- Insérer dans l'historique
  INSERT INTO fiche_suivi_history (
    fiche_suivi_id,
    snapshot,
    changed_by,
    change_type,
    changed_fields,
    change_description
  ) VALUES (
    NEW.id,
    to_jsonb(NEW),
    COALESCE(auth.uid(), NEW.supervisor_id),
    v_change_type,
    v_changed_fields,
    v_change_description
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour capturer automatiquement les changements
DROP TRIGGER IF EXISTS trigger_capture_fiche_suivi_changes ON fiche_suivi;
CREATE TRIGGER trigger_capture_fiche_suivi_changes
  AFTER INSERT OR UPDATE ON fiche_suivi
  FOR EACH ROW
  EXECUTE FUNCTION capture_fiche_suivi_changes();

-- Activer RLS
ALTER TABLE fiche_suivi_history ENABLE ROW LEVEL SECURITY;

-- Politique: Les étudiants peuvent voir l'historique de leurs fiches
CREATE POLICY "Students can view own fiche history"
  ON fiche_suivi_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fiche_suivi fs
      WHERE fs.id = fiche_suivi_history.fiche_suivi_id
        AND fs.student_id = auth.uid()
    )
  );

-- Politique: Les encadreurs peuvent voir l'historique des fiches de leurs étudiants
CREATE POLICY "Supervisors can view student fiche history"
  ON fiche_suivi_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fiche_suivi fs
      WHERE fs.id = fiche_suivi_history.fiche_suivi_id
        AND fs.supervisor_id = auth.uid()
    )
  );

-- Politique: Les chefs de département peuvent voir tout l'historique
CREATE POLICY "Department heads can view all fiche history"
  ON fiche_suivi_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fiche_suivi fs
      JOIN profiles p ON p.id = fs.student_id
      WHERE fs.id = fiche_suivi_history.fiche_suivi_id
        AND p.department_id IN (
          SELECT department_id FROM profiles WHERE id = auth.uid()
        )
    )
    AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
    )
  );

-- Fonction pour obtenir l'historique complet d'une fiche
CREATE OR REPLACE FUNCTION get_fiche_suivi_history(p_fiche_suivi_id UUID)
RETURNS TABLE(
  id UUID,
  change_type TEXT,
  changed_by_name TEXT,
  changed_fields TEXT[],
  change_description TEXT,
  created_at TIMESTAMPTZ,
  snapshot JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fsh.id,
    fsh.change_type,
    p.first_name || ' ' || p.last_name AS changed_by_name,
    fsh.changed_fields,
    fsh.change_description,
    fsh.created_at,
    fsh.snapshot
  FROM fiche_suivi_history fsh
  JOIN profiles p ON p.id = fsh.changed_by
  WHERE fsh.fiche_suivi_id = p_fiche_suivi_id
  ORDER BY fsh.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour comparer deux versions d'une fiche
CREATE OR REPLACE FUNCTION compare_fiche_versions(
  p_version1_id UUID,
  p_version2_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_snapshot1 JSONB;
  v_snapshot2 JSONB;
  v_differences JSONB := '{}'::jsonb;
  v_key TEXT;
BEGIN
  -- Récupérer les snapshots
  SELECT snapshot INTO v_snapshot1
  FROM fiche_suivi_history
  WHERE id = p_version1_id;
  
  SELECT snapshot INTO v_snapshot2
  FROM fiche_suivi_history
  WHERE id = p_version2_id;
  
  -- Comparer les champs importants
  FOR v_key IN SELECT * FROM jsonb_object_keys(v_snapshot1)
  LOOP
    IF v_snapshot1->v_key != v_snapshot2->v_key THEN
      v_differences := v_differences || jsonb_build_object(
        v_key, jsonb_build_object(
          'old_value', v_snapshot1->v_key,
          'new_value', v_snapshot2->v_key
        )
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'version1_date', (SELECT created_at FROM fiche_suivi_history WHERE id = p_version1_id),
    'version2_date', (SELECT created_at FROM fiche_suivi_history WHERE id = p_version2_id),
    'differences', v_differences
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour restaurer une version précédente
CREATE OR REPLACE FUNCTION restore_fiche_version(
  p_fiche_suivi_id UUID,
  p_history_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_snapshot JSONB;
  v_can_restore BOOLEAN;
BEGIN
  -- Vérifier les permissions
  SELECT EXISTS (
    SELECT 1 FROM fiche_suivi fs
    WHERE fs.id = p_fiche_suivi_id
      AND (fs.supervisor_id = auth.uid() OR fs.student_id = auth.uid())
  ) INTO v_can_restore;
  
  IF NOT v_can_restore THEN
    RAISE EXCEPTION 'Permission refusée pour restaurer cette version';
  END IF;
  
  -- Récupérer le snapshot
  SELECT snapshot INTO v_snapshot
  FROM fiche_suivi_history
  WHERE id = p_history_id
    AND fiche_suivi_id = p_fiche_suivi_id;
  
  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Version introuvable';
  END IF;
  
  -- Restaurer les champs (sauf les validations)
  UPDATE fiche_suivi
  SET
    work_done = v_snapshot->>'work_done',
    problems_encountered = v_snapshot->>'problems_encountered',
    recommendations = v_snapshot->>'recommendations',
    next_steps = v_snapshot->>'next_steps',
    progress_percentage = (v_snapshot->>'progress_percentage')::INTEGER,
    updated_at = NOW()
  WHERE id = p_fiche_suivi_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques de modifications
CREATE OR REPLACE FUNCTION get_fiche_modification_stats(p_fiche_suivi_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_total_changes INTEGER;
  v_last_modified TIMESTAMPTZ;
  v_most_active_editor TEXT;
BEGIN
  SELECT 
    COUNT(*),
    MAX(created_at)
  INTO v_total_changes, v_last_modified
  FROM fiche_suivi_history
  WHERE fiche_suivi_id = p_fiche_suivi_id;
  
  -- Trouver l'éditeur le plus actif
  SELECT p.first_name || ' ' || p.last_name INTO v_most_active_editor
  FROM fiche_suivi_history fsh
  JOIN profiles p ON p.id = fsh.changed_by
  WHERE fsh.fiche_suivi_id = p_fiche_suivi_id
  GROUP BY p.id, p.first_name, p.last_name
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  v_result := jsonb_build_object(
    'total_changes', v_total_changes,
    'last_modified', v_last_modified,
    'most_active_editor', v_most_active_editor,
    'change_types', (
      SELECT jsonb_object_agg(change_type, count)
      FROM (
        SELECT change_type, COUNT(*) as count
        FROM fiche_suivi_history
        WHERE fiche_suivi_id = p_fiche_suivi_id
        GROUP BY change_type
      ) sub
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Pour annuler cette migration, exécuter:
/*
DROP FUNCTION IF EXISTS get_fiche_modification_stats(UUID);
DROP FUNCTION IF EXISTS restore_fiche_version(UUID, UUID);
DROP FUNCTION IF EXISTS compare_fiche_versions(UUID, UUID);
DROP FUNCTION IF EXISTS get_fiche_suivi_history(UUID);
DROP POLICY IF EXISTS "Department heads can view all fiche history" ON fiche_suivi_history;
DROP POLICY IF EXISTS "Supervisors can view student fiche history" ON fiche_suivi_history;
DROP POLICY IF EXISTS "Students can view own fiche history" ON fiche_suivi_history;
DROP TRIGGER IF EXISTS trigger_capture_fiche_suivi_changes ON fiche_suivi;
DROP FUNCTION IF EXISTS capture_fiche_suivi_changes();
DROP TABLE IF EXISTS fiche_suivi_history CASCADE;
*/
