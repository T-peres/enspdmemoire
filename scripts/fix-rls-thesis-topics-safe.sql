-- Script SÉCURISÉ pour corriger les politiques RLS sur thesis_topics
-- Ce script vérifie d'abord les rôles disponibles avant de créer les politiques

-- Étape 1: Afficher les rôles disponibles
DO $$
DECLARE
  role_list TEXT;
BEGIN
  SELECT string_agg(enumlabel::TEXT, ', ' ORDER BY enumsortorder)
  INTO role_list
  FROM pg_enum
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role');
  
  RAISE NOTICE '📋 Rôles disponibles dans app_role: %', role_list;
END $$;

-- Étape 2: Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "thesis_topics_select_policy" ON thesis_topics;
DROP POLICY IF EXISTS "thesis_topics_insert_policy" ON thesis_topics;
DROP POLICY IF EXISTS "thesis_topics_update_policy" ON thesis_topics;
DROP POLICY IF EXISTS "thesis_topics_delete_policy" ON thesis_topics;

DO $$
BEGIN
  RAISE NOTICE '🗑️  Anciennes politiques supprimées';
END $$;

-- Étape 3: Politique de lecture (SELECT) - Tous les utilisateurs authentifiés peuvent voir les sujets
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

DO $$
BEGIN
  RAISE NOTICE '✅ Politique SELECT créée';
END $$;

-- Étape 4: Politique d'insertion (INSERT)
-- Utilise ONLY les rôles qui existent réellement dans la base
CREATE POLICY "thesis_topics_insert_policy" ON thesis_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- L'utilisateur doit avoir un rôle autorisé
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('student', 'supervisor', 'department_head', 'admin')
    )
    AND
    -- Le proposant doit être l'utilisateur actuel
    proposed_by = auth.uid()
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Politique INSERT créée';
END $$;

-- Étape 5: Politique de mise à jour (UPDATE)
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

DO $$
BEGIN
  RAISE NOTICE '✅ Politique UPDATE créée';
END $$;

-- Étape 6: Politique de suppression (DELETE)
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

DO $$
BEGIN
  RAISE NOTICE '✅ Politique DELETE créée';
END $$;

-- Étape 7: Vérifier que RLS est activé
ALTER TABLE thesis_topics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE '🔒 RLS activé sur thesis_topics';
END $$;

-- Étape 8: Afficher les politiques créées
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies
  WHERE tablename = 'thesis_topics';
  
  RAISE NOTICE '📊 Nombre de politiques actives: %', policy_count;
END $$;

-- Afficher le détail des politiques
SELECT 
  policyname as "Politique",
  cmd as "Commande",
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✓ Permissive'
    ELSE '✗ Restrictive'
  END as "Type"
FROM pg_policies
WHERE tablename = 'thesis_topics'
ORDER BY policyname;

-- Message final
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SUCCÈS: Politiques RLS mises à jour pour thesis_topics';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Résumé des permissions:';
  RAISE NOTICE '  • SELECT: Sujets approuvés visibles par tous';
  RAISE NOTICE '  • INSERT: Étudiants, superviseurs, chefs de département, admins';
  RAISE NOTICE '  • UPDATE: Proposant (si pending), superviseur, chef département, admin';
  RAISE NOTICE '  • DELETE: Proposant (si pending), chef département, admin';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Rafraîchissez votre application pour voir les changements';
END $$;
