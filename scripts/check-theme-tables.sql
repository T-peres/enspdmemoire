-- Vérifier quelle table contient les sujets de mémoire

-- 1. Lister toutes les tables qui pourraient contenir les thèmes
SELECT 
  '📋 TABLES DISPONIBLES' as titre,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE '%theme%' 
  OR table_name LIKE '%topic%'
  OR table_name LIKE '%thesis%'
  OR table_name LIKE '%memoire%'
)
ORDER BY table_name;

-- 2. Vérifier si la table themes existe
SELECT 
  '✓ Table themes' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') 
    THEN 'EXISTS'
    ELSE 'NOT EXISTS'
  END as status;

-- 3. Vérifier si la table thesis_topics existe
SELECT 
  '✓ Table thesis_topics' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thesis_topics') 
    THEN 'EXISTS'
    ELSE 'NOT EXISTS'
  END as status;

-- 4. Si themes est une vue, afficher sa définition
SELECT 
  '📖 Vue themes' as titre,
  definition
FROM pg_views
WHERE viewname = 'themes'
AND schemaname = 'public';
