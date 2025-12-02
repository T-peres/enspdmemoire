-- =====================================================
-- Migration: Consolidation et Documentation
-- Description: Consolidation finale, vérifications et documentation complète
-- Date: 2025-12-01
-- =====================================================

-- ===== FONCTION DE VÉRIFICATION GLOBALE =====

CREATE OR REPLACE FUNCTION verify_schema_integrity()
RETURNS TABLE(
  check_category TEXT,
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Vérifier l'existence des tables principales
  RETURN QUERY
  SELECT 
    'Tables'::TEXT,
    'Core tables exist'::TEXT,
    CASE WHEN COUNT(*) = 20 THEN 'OK' ELSE 'ERROR' END::TEXT,
    'Found ' || COUNT(*) || ' out of 20 expected tables'::TEXT
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'profiles', 'user_roles', 'departments', 'themes', 'thesis_topics',
      'supervisor_assignments', 'documents', 'fiche_suivi', 'defense_sessions',
      'defense_jury_members', 'final_grades', 'report_submissions',
      'plagiarism_reports', 'meetings', 'alerts', 'department_settings',
      'document_type_metadata', 'fiche_suivi_history', 'activity_logs', 'messages'
    );
  
  -- Vérifier les politiques RLS
  RETURN QUERY
  SELECT 
    'Security'::TEXT,
    'RLS enabled on tables'::TEXT,
    CASE WHEN COUNT(*) >= 15 THEN 'OK' ELSE 'WARNING' END::TEXT,
    'RLS enabled on ' || COUNT(*) || ' tables'::TEXT
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true;
  
  -- Vérifier les index
  RETURN QUERY
  SELECT 
    'Performance'::TEXT,
    'Indexes created'::TEXT,
    CASE WHEN COUNT(*) >= 50 THEN 'OK' ELSE 'WARNING' END::TEXT,
    'Found ' || COUNT(*) || ' indexes'::TEXT
  FROM pg_indexes
  WHERE schemaname = 'public';
  
  -- Vérifier les fonctions RPC
  RETURN QUERY
  SELECT 
    'Functions'::TEXT,
    'RPC functions exist'::TEXT,
    CASE WHEN COUNT(*) >= 20 THEN 'OK' ELSE 'WARNING' END::TEXT,
    'Found ' || COUNT(*) || ' functions'::TEXT
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f';
  
  -- Vérifier les triggers
  RETURN QUERY
  SELECT 
    'Automation'::TEXT,
    'Triggers configured'::TEXT,
    CASE WHEN COUNT(*) >= 10 THEN 'OK' ELSE 'WARNING' END::TEXT,
    'Found ' || COUNT(*) || ' triggers'::TEXT
  FROM pg_trigger
  WHERE tgrelid IN (
    SELECT oid FROM pg_class WHERE relnamespace = (
      SELECT oid FROM pg_namespace WHERE nspname = 'public'
    )
  )
  AND tgname NOT LIKE 'RI_%';
  
  -- Vérifier l'intégrité des données
  RETURN QUERY
  SELECT * FROM check_data_integrity();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== FONCTION DE MIGRATION DE DONNÉES =====

-- Fonction pour migrer les données de l'ancien schéma (si applicable)
CREATE OR REPLACE FUNCTION migrate_legacy_data()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_migrated_count INTEGER := 0;
BEGIN
  -- Migrer les rapports de plagiat vers les nouvelles relations
  UPDATE plagiarism_reports pr
  SET report_submission_id = (
    SELECT rs.id
    FROM report_submissions rs
    WHERE rs.student_id = (
      SELECT d.student_id
      FROM documents d
      WHERE d.id = pr.document_id
    )
    ORDER BY rs.submitted_at DESC
    LIMIT 1
  )
  WHERE pr.report_submission_id IS NULL
    AND pr.document_id IS NOT NULL;
  
  GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
  
  v_result := jsonb_build_object(
    'plagiarism_reports_migrated', v_migrated_count,
    'migration_date', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== FONCTION D'INITIALISATION POUR NOUVEAUX DÉPARTEMENTS =====

CREATE OR REPLACE FUNCTION initialize_department(
  p_department_name TEXT,
  p_department_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_department_id UUID;
  v_settings_id UUID;
  v_result JSONB;
BEGIN
  -- Créer le département
  INSERT INTO departments (name, code)
  VALUES (p_department_name, p_department_code)
  RETURNING id INTO v_department_id;
  
  -- Les paramètres sont créés automatiquement par trigger
  SELECT id INTO v_settings_id
  FROM department_settings
  WHERE department_id = v_department_id;
  
  v_result := jsonb_build_object(
    'department_id', v_department_id,
    'settings_id', v_settings_id,
    'status', 'initialized'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== FONCTION DE NETTOYAGE =====

CREATE OR REPLACE FUNCTION cleanup_old_data(p_days_old INTEGER DEFAULT 365)
RETURNS JSONB AS $$
DECLARE
  v_deleted_alerts INTEGER;
  v_deleted_logs INTEGER;
  v_result JSONB;
BEGIN
  -- Nettoyer les alertes anciennes et masquées
  DELETE FROM alerts
  WHERE dismissed = TRUE
    AND dismissed_at < NOW() - (p_days_old || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted_alerts = ROW_COUNT;
  
  -- Nettoyer les logs d'activité anciens
  DELETE FROM activity_logs
  WHERE created_at < NOW() - (p_days_old || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted_logs = ROW_COUNT;
  
  -- Nettoyer les alertes expirées
  PERFORM cleanup_expired_alerts();
  
  v_result := jsonb_build_object(
    'deleted_alerts', v_deleted_alerts,
    'deleted_logs', v_deleted_logs,
    'cleanup_date', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== VUES UTILES POUR LES RAPPORTS =====

-- Vue: Statistiques globales du système (version conditionnelle)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'defense_sessions'
  ) THEN
    -- Version complète avec defense_sessions
    EXECUTE '
    CREATE OR REPLACE VIEW system_statistics AS
    SELECT
      (SELECT COUNT(*) FROM profiles WHERE EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = profiles.id AND role = ''student''
      )) AS total_students,
      (SELECT COUNT(*) FROM profiles WHERE EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = profiles.id AND role = ''supervisor''
      )) AS total_supervisors,
      (SELECT COUNT(*) FROM themes WHERE status = ''approved'') AS active_themes,
      (SELECT COUNT(*) FROM defense_sessions WHERE status = ''scheduled'') AS scheduled_defenses,
      (SELECT COUNT(*) FROM defense_sessions WHERE status = ''completed'') AS completed_defenses,
      (SELECT COUNT(*) FROM documents WHERE status = ''under_review'') AS pending_documents,
      (SELECT COUNT(*) FROM fiche_suivi WHERE supervisor_validated = FALSE) AS pending_fiches,
      (SELECT AVG(plagiarism_score) FROM plagiarism_reports) AS avg_plagiarism_score,
      (SELECT COUNT(*) FROM alerts WHERE dismissed = FALSE) AS active_alerts
    ';
    RAISE NOTICE '✅ Vue system_statistics créée (version complète)';
  ELSE
    -- Version sans defense_sessions
    EXECUTE '
    CREATE OR REPLACE VIEW system_statistics AS
    SELECT
      (SELECT COUNT(*) FROM profiles WHERE EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = profiles.id AND role = ''student''
      )) AS total_students,
      (SELECT COUNT(*) FROM profiles WHERE EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = profiles.id AND role = ''supervisor''
      )) AS total_supervisors,
      (SELECT COUNT(*) FROM themes WHERE status = ''approved'') AS active_themes,
      0 AS scheduled_defenses,
      0 AS completed_defenses,
      (SELECT COUNT(*) FROM documents WHERE status = ''under_review'') AS pending_documents,
      (SELECT COUNT(*) FROM fiche_suivi WHERE supervisor_validated = FALSE) AS pending_fiches,
      (SELECT AVG(plagiarism_score) FROM plagiarism_reports) AS avg_plagiarism_score,
      (SELECT COUNT(*) FROM alerts WHERE dismissed = FALSE) AS active_alerts
    ';
    RAISE WARNING '⚠️ Vue system_statistics créée (version simplifiée sans defense_sessions)';
  END IF;
END $$;

-- Vue: Progression des étudiants (version conditionnelle)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'defense_sessions'
  ) THEN
    EXECUTE '
    CREATE OR REPLACE VIEW student_progress AS
    SELECT
      p.id AS student_id,
      p.first_name || '' '' || p.last_name AS student_name,
      p.department_id,
      d.name AS department_name,
      t.id AS theme_id,
      t.title AS theme_title,
      t.status AS theme_status,
      sa.supervisor_id,
      ps.first_name || '' '' || ps.last_name AS supervisor_name,
      (SELECT COUNT(*) FROM documents WHERE student_id = p.id AND status = ''approved'') AS approved_documents,
      (SELECT COUNT(*) FROM meetings WHERE student_id = p.id AND status = ''completed'') AS completed_meetings,
      (SELECT bool_and(supervisor_validated) FROM fiche_suivi WHERE student_id = p.id) AS fiches_validated,
      (SELECT passed FROM plagiarism_reports pr
       JOIN report_submissions rs ON rs.id = pr.report_submission_id
       WHERE rs.student_id = p.id
       ORDER BY pr.checked_at DESC LIMIT 1) AS plagiarism_passed,
      ds.defense_date,
      ds.status AS defense_status,
      fg.final_grade,
      fg.decision
    FROM profiles p
    JOIN departments d ON d.id = p.department_id
    LEFT JOIN themes t ON t.student_id = p.id AND t.status = ''approved''
    LEFT JOIN supervisor_assignments sa ON sa.student_id = p.id AND sa.is_active = TRUE
    LEFT JOIN profiles ps ON ps.id = sa.supervisor_id
    LEFT JOIN defense_sessions ds ON ds.student_id = p.id
    LEFT JOIN final_grades fg ON fg.student_id = p.id
    WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = ''student'')
    ';
  ELSE
    EXECUTE '
    CREATE OR REPLACE VIEW student_progress AS
    SELECT
      p.id AS student_id,
      p.first_name || '' '' || p.last_name AS student_name,
      p.department_id,
      d.name AS department_name,
      t.id AS theme_id,
      t.title AS theme_title,
      t.status AS theme_status,
      sa.supervisor_id,
      ps.first_name || '' '' || ps.last_name AS supervisor_name,
      (SELECT COUNT(*) FROM documents WHERE student_id = p.id AND status = ''approved'') AS approved_documents,
      (SELECT COUNT(*) FROM meetings WHERE student_id = p.id AND status = ''completed'') AS completed_meetings,
      (SELECT bool_and(supervisor_validated) FROM fiche_suivi WHERE student_id = p.id) AS fiches_validated,
      (SELECT passed FROM plagiarism_reports pr
       JOIN report_submissions rs ON rs.id = pr.report_submission_id
       WHERE rs.student_id = p.id
       ORDER BY pr.checked_at DESC LIMIT 1) AS plagiarism_passed,
      NULL::TIMESTAMPTZ AS defense_date,
      NULL::TEXT AS defense_status,
      fg.final_grade,
      fg.decision
    FROM profiles p
    JOIN departments d ON d.id = p.department_id
    LEFT JOIN themes t ON t.student_id = p.id AND t.status = ''approved''
    LEFT JOIN supervisor_assignments sa ON sa.student_id = p.id AND sa.is_active = TRUE
    LEFT JOIN profiles ps ON ps.id = sa.supervisor_id
    LEFT JOIN final_grades fg ON fg.student_id = p.id
    WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = ''student'')
    ';
  END IF;
END $$;

-- Vue: Charge de travail des encadreurs (version conditionnelle)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'defense_sessions'
  ) THEN
    EXECUTE '
    CREATE OR REPLACE VIEW supervisor_workload AS
    SELECT
      p.id AS supervisor_id,
      p.first_name || '' '' || p.last_name AS supervisor_name,
      p.department_id,
      d.name AS department_name,
      COUNT(DISTINCT sa.student_id) AS active_students,
      COUNT(DISTINCT CASE WHEN doc.status = ''under_review'' THEN doc.id END) AS pending_validations,
      COUNT(DISTINCT CASE WHEN fs.supervisor_validated = FALSE THEN fs.id END) AS pending_fiches,
      AVG(fg.final_grade) AS avg_student_grade,
      COUNT(DISTINCT CASE WHEN ds.status = ''completed'' THEN ds.id END) AS completed_defenses
    FROM profiles p
    JOIN departments d ON d.id = p.department_id
    LEFT JOIN supervisor_assignments sa ON sa.supervisor_id = p.id AND sa.is_active = TRUE
    LEFT JOIN documents doc ON doc.reviewed_by = p.id
    LEFT JOIN fiche_suivi fs ON fs.supervisor_id = p.id
    LEFT JOIN final_grades fg ON fg.student_id = sa.student_id
    LEFT JOIN defense_sessions ds ON ds.student_id = sa.student_id
    WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = ''supervisor'')
    GROUP BY p.id, p.first_name, p.last_name, p.department_id, d.name
    ';
  ELSE
    EXECUTE '
    CREATE OR REPLACE VIEW supervisor_workload AS
    SELECT
      p.id AS supervisor_id,
      p.first_name || '' '' || p.last_name AS supervisor_name,
      p.department_id,
      d.name AS department_name,
      COUNT(DISTINCT sa.student_id) AS active_students,
      COUNT(DISTINCT CASE WHEN doc.status = ''under_review'' THEN doc.id END) AS pending_validations,
      COUNT(DISTINCT CASE WHEN fs.supervisor_validated = FALSE THEN fs.id END) AS pending_fiches,
      AVG(fg.final_grade) AS avg_student_grade,
      0 AS completed_defenses
    FROM profiles p
    JOIN departments d ON d.id = p.department_id
    LEFT JOIN supervisor_assignments sa ON sa.supervisor_id = p.id AND sa.is_active = TRUE
    LEFT JOIN documents doc ON doc.reviewed_by = p.id
    LEFT JOIN fiche_suivi fs ON fs.supervisor_id = p.id
    LEFT JOIN final_grades fg ON fg.student_id = sa.student_id
    WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = ''supervisor'')
    GROUP BY p.id, p.first_name, p.last_name, p.department_id, d.name
    ';
  END IF;
END $$;


-- ===== DOCUMENTATION DES TABLES =====

-- Ajouter des commentaires détaillés sur toutes les tables principales
COMMENT ON TABLE profiles IS 'Profils utilisateurs - Contient les informations de base de tous les utilisateurs du système';
COMMENT ON TABLE user_roles IS 'Rôles utilisateurs - Gère les rôles multiples (student, supervisor, jury, department_head, admin)';
COMMENT ON TABLE departments IS 'Départements - Structure organisationnelle de l''établissement';
COMMENT ON TABLE themes IS 'Thèmes de mémoire - Sujets de mémoire sélectionnés et validés par les étudiants';
COMMENT ON TABLE thesis_topics IS 'Sujets proposés - Catalogue des sujets de mémoire proposés par les encadreurs';
COMMENT ON TABLE supervisor_assignments IS 'Affectations encadreurs - Lie les étudiants à leurs encadreurs';
COMMENT ON TABLE documents IS 'Documents - Tous les documents soumis par les étudiants (rapports, présentations, etc.)';
COMMENT ON TABLE fiche_suivi IS 'Fiches de suivi - Suivi régulier de l''avancement des étudiants';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fiche_suivi_history') THEN
    COMMENT ON TABLE fiche_suivi_history IS 'Historique des fiches - Traçabilité complète des modifications des fiches de suivi';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'defense_sessions') THEN
    COMMENT ON TABLE defense_sessions IS 'Sessions de soutenance - Planification et gestion des soutenances';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'defense_jury_members') THEN
    COMMENT ON TABLE defense_jury_members IS 'Membres du jury - Composition des jurys de soutenance';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'defense_minutes') THEN
    COMMENT ON TABLE defense_minutes IS 'Procès-verbaux - PV des soutenances avec décisions et observations';
  END IF;
END $$;
COMMENT ON TABLE final_grades IS 'Notes finales - Notes d''encadrement, de rapport et de soutenance';
COMMENT ON TABLE report_submissions IS 'Soumissions de rapports - Historique des soumissions de documents';
COMMENT ON TABLE plagiarism_reports IS 'Rapports de plagiat - Résultats des contrôles anti-plagiat';
COMMENT ON TABLE meetings IS 'Rencontres - Historique des rencontres encadreur-étudiant';
COMMENT ON TABLE alerts IS 'Alertes - Système de notifications pour tous les utilisateurs';
COMMENT ON TABLE department_settings IS 'Paramètres département - Configuration personnalisée par département';
COMMENT ON TABLE document_type_metadata IS 'Métadonnées documents - Configuration des types de documents acceptés';
COMMENT ON TABLE activity_logs IS 'Logs d''activité - Traçabilité de toutes les actions importantes';
COMMENT ON TABLE messages IS 'Messages - Système de messagerie interne';


-- ===== FONCTION DE GÉNÉRATION DE RAPPORT COMPLET =====

CREATE OR REPLACE FUNCTION generate_system_report()
RETURNS JSONB AS $$
DECLARE
  v_report JSONB;
BEGIN
  v_report := jsonb_build_object(
    'generated_at', NOW(),
    'system_statistics', (SELECT row_to_json(system_statistics.*) FROM system_statistics),
    'schema_integrity', (
      SELECT jsonb_agg(row_to_json(t))
      FROM verify_schema_integrity() t
    ),
    'database_size', pg_size_pretty(pg_database_size(current_database())),
    'table_sizes', (
      SELECT jsonb_object_agg(
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
      )
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    ),
    'index_usage', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT * FROM get_index_usage_stats()
        ORDER BY index_scans DESC
        LIMIT 10
      ) t
    )
  );
  
  RETURN v_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===== PERMISSIONS POUR LES FONCTIONS =====

-- Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION verify_schema_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_system_report() TO authenticated;
GRANT SELECT ON system_statistics TO authenticated;
GRANT SELECT ON student_progress TO authenticated;
GRANT SELECT ON supervisor_workload TO authenticated;


-- ===== EXÉCUTION DES VÉRIFICATIONS INITIALES =====

-- Vérifier l'intégrité du schéma
DO $$
DECLARE
  v_check RECORD;
  v_has_errors BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '=== VÉRIFICATION DE L''INTÉGRITÉ DU SCHÉMA ===';
  
  FOR v_check IN SELECT * FROM verify_schema_integrity() LOOP
    RAISE NOTICE '[%] % - %: %', 
      v_check.check_category, 
      v_check.check_name, 
      v_check.status, 
      v_check.details;
    
    IF v_check.status = 'ERROR' THEN
      v_has_errors := TRUE;
    END IF;
  END LOOP;
  
  IF v_has_errors THEN
    RAISE WARNING 'Des erreurs ont été détectées dans le schéma. Veuillez vérifier les logs.';
  ELSE
    RAISE NOTICE 'Toutes les vérifications sont passées avec succès!';
  END IF;
END $$;

-- Mettre à jour les statistiques
SELECT update_table_statistics();

-- Commentaire final avec date dynamique
DO $$
DECLARE
  v_comment TEXT;
BEGIN
  v_comment := 'Système de Gestion des Mémoires ENSPD - Version 2.0 - Migrations complètes appliquées le ' || NOW()::DATE;
  EXECUTE format('COMMENT ON DATABASE %I IS %L', current_database(), v_comment);
END $$;

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Pour annuler cette migration, exécuter:
/*
DROP VIEW IF EXISTS supervisor_workload;
DROP VIEW IF EXISTS student_progress;
DROP VIEW IF EXISTS system_statistics;
DROP FUNCTION IF EXISTS generate_system_report();
DROP FUNCTION IF EXISTS cleanup_old_data(INTEGER);
DROP FUNCTION IF EXISTS initialize_department(TEXT, TEXT);
DROP FUNCTION IF EXISTS migrate_legacy_data();
DROP FUNCTION IF EXISTS verify_schema_integrity();
*/

-- =====================================================
-- FIN DES MIGRATIONS
-- =====================================================
