-- =====================================================
-- Script de Vérification - Tables pour Migration 4
-- =====================================================

-- Vérifier l'existence de toutes les tables nécessaires
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_name = tables_to_check.table_name
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status
FROM (VALUES 
  ('plagiarism_reports'),
  ('report_submissions'),
  ('final_grades'),
  ('defense_sessions'),
  ('themes'),
  ('thesis_topics'),
  ('departments')
) AS tables_to_check(table_name)
ORDER BY table_name;

-- Résumé
SELECT 
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = tables_to_check.table_name
  )) || ' / 7 tables trouvées' as summary
FROM (VALUES 
  ('plagiarism_reports'),
  ('report_submissions'),
  ('final_grades'),
  ('defense_sessions'),
  ('themes'),
  ('thesis_topics'),
  ('departments')
) AS tables_to_check(table_name);
