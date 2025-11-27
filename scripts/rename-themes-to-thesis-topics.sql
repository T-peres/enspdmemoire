-- =====================================================
-- RENOMMER LA TABLE "themes" EN "thesis_topics"
-- =====================================================
-- Ce script renomme la table "themes" en "thesis_topics"
-- pour correspondre à ce que l'application attend

-- ATTENTION : Exécutez d'abord scripts/check-tables.sql
-- pour vérifier quelle table existe

-- =====================================================
-- ÉTAPE 1 : Vérifier que "themes" existe
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') THEN
    RAISE EXCEPTION 'La table "themes" n''existe pas. Rien à renommer.';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thesis_topics') THEN
    RAISE EXCEPTION 'La table "thesis_topics" existe déjà. Supprimez-la d''abord ou migrez les données.';
  END IF;
  
  RAISE NOTICE '✓ Vérifications OK. Début du renommage...';
END $$;

-- =====================================================
-- ÉTAPE 2 : Renommer la table
-- =====================================================

ALTER TABLE themes RENAME TO thesis_topics;

-- =====================================================
-- ÉTAPE 3 : Renommer les index
-- =====================================================

ALTER INDEX IF EXISTS idx_themes_student RENAME TO idx_thesis_topics_student;
ALTER INDEX IF EXISTS idx_themes_supervisor RENAME TO idx_thesis_topics_supervisor;
ALTER INDEX IF EXISTS idx_themes_status RENAME TO idx_thesis_topics_status;

-- =====================================================
-- ÉTAPE 4 : Mettre à jour les contraintes de clés étrangères
-- =====================================================

-- Les contraintes de clés étrangères gardent leur nom
-- mais pointent maintenant vers thesis_topics

-- =====================================================
-- ÉTAPE 5 : Vérifier le résultat
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thesis_topics') THEN
    RAISE NOTICE '✓ Table "thesis_topics" créée avec succès';
  ELSE
    RAISE EXCEPTION 'Erreur : La table "thesis_topics" n''existe pas après le renommage';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') THEN
    RAISE EXCEPTION 'Erreur : La table "themes" existe toujours';
  ELSE
    RAISE NOTICE '✓ Table "themes" n''existe plus';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RENOMMAGE TERMINÉ AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'La table "themes" a été renommée en "thesis_topics"';
  RAISE NOTICE 'L''application devrait maintenant fonctionner correctement';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes :';
  RAISE NOTICE '1. Rechargez l''application (F5)';
  RAISE NOTICE '2. Vérifiez que l''erreur 404 a disparu';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- ÉTAPE 6 : Afficher le nombre d'enregistrements
-- =====================================================

SELECT 
  'thesis_topics' as table_name,
  COUNT(*) as nombre_enregistrements
FROM thesis_topics;
