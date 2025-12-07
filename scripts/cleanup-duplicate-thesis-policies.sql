-- Nettoyer les politiques en double sur thesis_topics
-- Garder uniquement les nouvelles politiques complètes

-- Supprimer les anciennes politiques spécifiques
DROP POLICY IF EXISTS "Students can create themes" ON thesis_topics;
DROP POLICY IF EXISTS "Students can view their own themes" ON thesis_topics;
DROP POLICY IF EXISTS "Supervisors can view assigned themes" ON thesis_topics;

-- Vérifier les politiques restantes
SELECT 
  policyname as "Politique",
  cmd as "Commande",
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✓ Permissive'
    ELSE '✗ Restrictive'
  END as "Type"
FROM pg_policies
WHERE tablename = 'thesis_topics'
ORDER BY cmd, policyname;

-- Message de confirmation
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies
  WHERE tablename = 'thesis_topics';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Nettoyage terminé';
  RAISE NOTICE '📊 Politiques actives: %', policy_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Politiques restantes:';
  RAISE NOTICE '  • thesis_topics_select_policy (SELECT)';
  RAISE NOTICE '  • thesis_topics_insert_policy (INSERT)';
  RAISE NOTICE '  • thesis_topics_update_policy (UPDATE)';
  RAISE NOTICE '  • thesis_topics_delete_policy (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Rafraîchissez votre application (Ctrl+F5)';
END $$;
