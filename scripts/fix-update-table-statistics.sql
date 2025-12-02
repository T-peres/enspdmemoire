-- Corriger la fonction update_table_statistics pour gérer les tables manquantes

DROP FUNCTION IF EXISTS update_table_statistics();

CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
DECLARE
  v_table_name TEXT;
  v_tables TEXT[] := ARRAY[
    'profiles', 'user_roles', 'thesis_topics', 'supervisor_assignments',
    'documents', 'fiche_suivi', 'defense_sessions', 'defense_jury_members',
    'final_grades', 'report_submissions', 'plagiarism_reports', 'meetings',
    'alerts', 'department_settings', 'activity_logs', 'messages', 'departments'
  ];
BEGIN
  FOREACH v_table_name IN ARRAY v_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = v_table_name
    ) THEN
      EXECUTE format('ANALYZE %I', v_table_name);
      RAISE NOTICE 'Analyzed table: %', v_table_name;
    ELSE
      RAISE WARNING 'Table % does not exist, skipping ANALYZE', v_table_name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécuter l'analyse
SELECT update_table_statistics();
