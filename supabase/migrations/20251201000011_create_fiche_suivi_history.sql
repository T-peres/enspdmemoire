-- =====================================================
-- TABLE: fiche_suivi_history
-- =====================================================
-- Historisation complète des modifications des fiches de suivi
-- Date: 1er Décembre 2025

CREATE TABLE IF NOT EXISTS fiche_suivi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_suivi_id UUID NOT NULL REFERENCES fiche_suivi(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Snapshot des changements
  changes JSONB NOT NULL,
  
  -- Métadonnées
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_type TEXT DEFAULT 'update', -- 'create', 'update', 'validate'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX idx_fiche_suivi_history_fiche ON fiche_suivi_history(fiche_suivi_id);
CREATE INDEX idx_fiche_suivi_history_theme ON fiche_suivi_history(theme_id);
CREATE INDEX idx_fiche_suivi_history_student ON fiche_suivi_history(student_id);
CREATE INDEX idx_fiche_suivi_history_changed_at ON fiche_suivi_history(changed_at DESC);

-- RLS
ALTER TABLE fiche_suivi_history ENABLE ROW LEVEL SECURITY;

-- Politique: Les étudiants peuvent voir l'historique de leurs fiches
CREATE POLICY "Students can view own fiche history"
  ON fiche_suivi_history FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Politique: Les encadreurs peuvent voir l'historique des fiches de leurs étudiants
CREATE POLICY "Supervisors can view assigned fiche history"
  ON fiche_suivi_history FOR SELECT
  TO authenticated
  USING (supervisor_id = auth.uid());

-- Politique: Les chefs de département peuvent voir tout l'historique de leur département
CREATE POLICY "Department heads can view department fiche history"
  ON fiche_suivi_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.department_id = (
          SELECT department_id FROM profiles WHERE id = student_id
        )
        AND EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
            AND role = 'department_head'
        )
    )
  );

-- Commentaire
COMMENT ON TABLE fiche_suivi_history IS 
'Historique complet de toutes les modifications apportées aux fiches de suivi pour audit et traçabilité.';
