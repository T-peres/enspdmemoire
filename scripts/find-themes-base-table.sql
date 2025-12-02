-- =====================================================
-- Script - Trouver la Table Sous-jacente de themes
-- =====================================================

-- Voir la définition de la vue themes
SELECT 
  'Définition de la vue themes:' as info,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public' 
  AND table_name = 'themes';

-- Trouver toutes les tables qui pourraient être la base
SELECT 
  table_name,
  table_type,
  '✅ Candidat potentiel' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND (
    table_name LIKE '%theme%'
    OR table_name LIKE '%thesis%'
    OR table_name LIKE '%topic%'
    OR table_name LIKE '%sujet%'
  )
ORDER BY table_name;

-- Vérifier si thesis_topics existe (candidat le plus probable)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'thesis_topics'
    ) THEN '✅ thesis_topics existe - c''est probablement la table de base'
    ELSE '❌ thesis_topics n''existe pas'
  END as thesis_topics_status;

-- Si thesis_topics existe, voir ses colonnes
SELECT 
  'Colonnes de thesis_topics:' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'thesis_topics'
ORDER BY ordinal_position;
