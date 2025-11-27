-- =====================================================
-- DIAGNOSTIC COMPLET DE L'ÉTAT DU SCHÉMA
-- =====================================================

-- 1. Vérifier quelles tables existent
SELECT 
  'Tables existantes' as info,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('themes', 'thesis_topics', 'fiche_suivi', 'report_submissions', 
                     'defense_sessions', 'final_grades', 'supervisor_assignments')
ORDER BY table_name;

-- 2. Vérifier les colonnes de thesis_topics
SELECT 
  'Colonnes de thesis_topics' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'thesis_topics'
ORDER BY ordinal_position;

-- 3. Vérifier les colonnes de fiche_suivi
SELECT 
  'Colonnes de fiche_suivi' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'fiche_suivi'
ORDER BY ordinal_position;

-- 4. Vérifier les contraintes de clés étrangères
SELECT 
  'Contraintes FK' as info,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (tc.table_name IN ('fiche_suivi', 'report_submissions', 'defense_sessions', 'final_grades')
       OR ccu.table_name IN ('themes', 'thesis_topics'))
ORDER BY tc.table_name, kcu.column_name;
