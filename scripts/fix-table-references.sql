-- =====================================================
-- SCRIPT DE CORRECTION - Références de tables
-- =====================================================
-- Ce script vérifie et corrige les références entre themes et thesis_topics

-- 1. Vérifier quelle table existe
DO $$
DECLARE
  has_themes BOOLEAN;
  has_thesis_topics BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'themes'
  ) INTO has_themes;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'thesis_topics'
  ) INTO has_thesis_topics;
  
  RAISE NOTICE 'Table themes existe: %', has_themes;
  RAISE NOTICE 'Table thesis_topics existe: %', has_thesis_topics;
  
  IF has_thesis_topics AND NOT has_themes THEN
    RAISE NOTICE 'Utilisation de thesis_topics comme table principale';
  ELSIF has_themes AND NOT has_thesis_topics THEN
    RAISE NOTICE 'Utilisation de themes comme table principale';
  ELSIF has_themes AND has_thesis_topics THEN
    RAISE WARNING 'Les deux tables existent! Vérification nécessaire';
  ELSE
    RAISE WARNING 'Aucune table de thèmes trouvée!';
  END IF;
END $$;

-- 2. Si thesis_topics existe, créer un alias/vue pour themes (pour compatibilité)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'thesis_topics'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'themes'
  ) THEN
    -- Créer une vue themes qui pointe vers thesis_topics
    CREATE OR REPLACE VIEW themes AS SELECT * FROM thesis_topics;
    RAISE NOTICE 'Vue themes créée pointant vers thesis_topics';
  END IF;
END $$;
