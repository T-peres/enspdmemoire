-- =====================================================
-- CORRECTION COMPLÈTE DES POLITIQUES RLS
-- =====================================================
-- Ce script ajoute toutes les politiques RLS manquantes
-- pour permettre les interactions entre toutes les interfaces

-- =====================================================
-- 1. POLITIQUES POUR THEMES
-- =====================================================

-- Encadreurs peuvent modifier les thèmes qui leur sont assignés
DROP POLICY IF EXISTS "Supervisors can update assigned themes" ON themes;
CREATE POLICY "Supervisors can update assigned themes"
  ON themes FOR UPDATE
  TO authenticated
  USING (auth.uid() = supervisor_id)
  WITH CHECK (auth.uid() = supervisor_id);

-- Chefs de département peuvent voir tous les thèmes de leur département
DROP POLICY IF EXISTS "Department heads can view department themes" ON themes;
CREATE POLICY "Department heads can view department themes"
  ON themes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
        AND ur.role = 'department_head'
        AND p.department_id = (
          SELECT department_id FROM profiles WHERE id = themes.student_id
        )
    )
  );

-- Chefs de département peuvent modifier les thèmes de leur département
DROP POLICY IF EXISTS "Department heads can update department themes" ON themes;
CREATE POLICY "Department heads can update department themes"
  ON themes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
        AND ur.role = 'department_head'
        AND p.department_id = (
          SELECT department_id FROM profiles WHERE id = themes.student_id
        )
    )
  );

-- Jury peut voir les thèmes approuvés qui leur sont assignés
DROP POLICY IF EXISTS "Jury can view assigned themes" ON themes;
CREATE POLICY "Jury can view assigned themes"
  ON themes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jury_members
      WHERE jury_me