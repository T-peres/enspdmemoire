-- Vérifier les tables existantes
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('themes', 'thesis_topics', 'report_submissions', 'defense_sessions')
ORDER BY table_name;

-- Vérifier si themes est une vue ou une table
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'themes';

-- Vérifier la structure de thesis_topics
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'thesis_topics'
ORDER BY ordinal_position;
