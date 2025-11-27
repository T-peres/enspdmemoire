-- =====================================================
-- VÉRIFIER QUELLES TABLES EXISTENT
-- =====================================================

-- Lister toutes les tables de l'application
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'themes',
    'thesis_topics',
    'profiles',
    'user_roles',
    'departments',
    'documents',
    'supervisor_assignments',
    'fiche_suivi',
    'plagiarism_reports',
    'jury_decisions',
    'archives'
  )
ORDER BY table_name;

-- Vérifier si 'themes' existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') 
    THEN '✓ Table "themes" existe'
    ELSE '✗ Table "themes" n''existe pas'
  END as status_themes;

-- Vérifier si 'thesis_topics' existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thesis_topics') 
    THEN '✓ Table "thesis_topics" existe'
    ELSE '✗ Table "thesis_topics" n''existe pas'
  END as status_thesis_topics;

-- Compter les enregistrements dans chaque table (si elle existe)
DO $$
DECLARE
  v_themes_count INTEGER := 0;
  v_thesis_topics_count INTEGER := 0;
BEGIN
  -- Compter themes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') THEN
    SELECT COUNT(*) INTO v_themes_count FROM themes;
    RAISE NOTICE 'Table "themes" : % enregistrement(s)', v_themes_count;
  ELSE
    RAISE NOTICE 'Table "themes" : n''existe pas';
  END IF;

  -- Compter thesis_topics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thesis_topics') THEN
    SELECT COUNT(*) INTO v_thesis_topics_count FROM thesis_topics;
    RAISE NOTICE 'Table "thesis_topics" : % enregistrement(s)', v_thesis_topics_count;
  ELSE
    RAISE NOTICE 'Table "thesis_topics" : n''existe pas';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RECOMMANDATION :';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thesis_topics') THEN
    RAISE NOTICE 'Vous utilisez la table "themes"';
    RAISE NOTICE 'L''application doit être mise à jour pour utiliser "themes"';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thesis_topics')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') THEN
    RAISE NOTICE 'Vous utilisez la table "thesis_topics"';
    RAISE NOTICE 'C''est correct, l''application est compatible';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thesis_topics') THEN
    RAISE NOTICE 'Les DEUX tables existent !';
    RAISE NOTICE 'Il faut choisir une seule table et migrer les données';
  ELSE
    RAISE NOTICE 'AUCUNE table de thèmes n''existe !';
    RAISE NOTICE 'Exécutez une migration pour créer la structure';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
