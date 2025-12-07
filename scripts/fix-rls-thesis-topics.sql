-- Script pour corriger les politiques RLS sur thesis_topics
-- Ce script résout l'erreur 403 lors de la lecture des sujets de thèse

-- 1. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "thesis_topics_select_policy" ON thesis_topics;
DROP POLICY IF EXISTS "thesis_topics_insert_policy" ON thesis_topics;
DROP POLICY IF EXISTS "thesis_topics_update_policy" ON thesis_topics;
DROP POLICY IF EXISTS "thesis_topics_delete_policy" ON thesis_topics;

-- 2. Politique de lecture (SELECT) - Tous les utilisateurs authentifiés peuvent voir les sujets
CREATE POLICY "thesis_topics_select_policy" ON thesis_topics
  FOR SELECT
  TO authenticated
  USING (
    -- Tout le monde peut voir les sujets approuvés
    status = 'approved'
    OR
    -- Le proposant peut voir ses propres sujets
    proposed_by = auth.uid()
    OR
    -- Le superviseur peut voir les sujets qui lui sont assignés
    supervisor_id = auth.uid()
    OR
    -- Les chefs de département peuvent voir les sujets de leur département
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
        AND p.department_id = thesis_topics.department_id
        AND ur.role = 'department_head'
    )
    OR
    -- Les admins peuvent tout voir
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Politique d'insertion (INSERT) - Étudiants, superviseurs, chefs de département et admins
CREATE POLICY "thesis_topics_insert_policy" ON thesis_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- L'utilisateur doit être étudiant, superviseur, chef de département ou admin
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('student', 'supervisor', 'department_head', 'admin')
    )
    AND
    -- Le proposant doit être l'utilisateur actuel
    proposed_by = auth.uid()
  );

-- 4. Politique de mise à jour (UPDATE) - Proposant, superviseur, chef de département ou admin
CREATE POLICY "thesis_topics_update_policy" ON thesis_topics
  FOR UPDATE
  TO authenticated
  USING (
    -- Le proposant peut modifier son sujet (si pas encore approuvé)
    (proposed_by = auth.uid() AND status = 'pending')
    OR
    -- Le superviseur peut modifier les sujets qui lui sont assignés
    supervisor_id = auth.uid()
    OR
    -- Le chef de département peut modifier les sujets de son département
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
        AND p.department_id = thesis_topics.department_id
        AND ur.role = 'department_head'
    )
    OR
    -- Les admins peuvent tout modifier
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    -- Mêmes conditions pour la vérification après mise à jour
    (proposed_by = auth.uid() AND status = 'pending')
    OR supervisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
        AND p.department_id = thesis_topics.department_id
        AND ur.role = 'department_head'
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Politique de suppression (DELETE) - Proposant (si pending), chef de département ou admin
CREATE POLICY "thesis_topics_delete_policy" ON thesis_topics
  FOR DELETE
  TO authenticated
  USING (
    -- Le proposant peut supprimer son sujet s'il est en attente
    (proposed_by = auth.uid() AND status = 'pending')
    OR
    -- Le chef de département peut supprimer les sujets de son département
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
        AND p.department_id = thesis_topics.department_id
        AND ur.role = 'department_head'
    )
    OR
    -- Les admins peuvent tout supprimer
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Vérifier que RLS est activé
ALTER TABLE thesis_topics ENABLE ROW LEVEL SECURITY;

-- 7. Afficher les politiques créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'thesis_topics'
ORDER BY policyname;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS pour thesis_topics mises à jour avec succès';
  RAISE NOTICE '📋 4 politiques créées: SELECT, INSERT, UPDATE, DELETE';
  RAISE NOTICE '🔒 RLS activé sur la table thesis_topics';
END $$;
