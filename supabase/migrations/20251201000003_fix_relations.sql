-- =====================================================
-- Migration: Correction des relations entre tables
-- Description: Corriger les incohérences de relations identifiées dans l'audit
-- Date: 2025-12-01
-- =====================================================

-- ===== CORRECTION 1: plagiarism_reports ↔ report_submissions =====
-- Problème: plagiarism_reports référence document_id mais devrait référencer report_submissions

DO $$ 
BEGIN
  -- Vérifier si la table plagiarism_reports existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'plagiarism_reports'
  ) THEN
    -- Supprimer document_id si elle existe
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'plagiarism_reports' 
        AND column_name = 'document_id'
    ) THEN
      ALTER TABLE plagiarism_reports DROP COLUMN document_id;
      RAISE NOTICE '✅ Colonne document_id supprimée de plagiarism_reports';
    END IF;
    
    -- Ajouter report_submission_id si elle n'existe pas
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'plagiarism_reports' 
        AND column_name = 'report_submission_id'
    ) THEN
      ALTER TABLE plagiarism_reports 
        ADD COLUMN report_submission_id UUID REFERENCES report_submissions(id) ON DELETE CASCADE;
      
      CREATE INDEX idx_plagiarism_reports_submission ON plagiarism_reports(report_submission_id);
      
      RAISE NOTICE '✅ Colonne report_submission_id ajoutée à plagiarism_reports';
    ELSE
      RAISE NOTICE '✅ Colonne report_submission_id existe déjà dans plagiarism_reports';
    END IF;
  ELSE
    RAISE WARNING '⚠️ Table plagiarism_reports non trouvée - correction ignorée';
  END IF;
END $$;


-- ===== CORRECTION 2: final_grades ↔ defense_sessions =====
-- Problème: Pas de lien direct entre les notes finales et les soutenances

DO $$ 
BEGIN
  -- Vérifier si la table final_grades existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'final_grades'
  ) THEN
    -- Vérifier si la colonne n'existe pas déjà
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'final_grades' 
        AND column_name = 'defense_session_id'
    ) THEN
      -- Vérifier si defense_sessions existe avant de créer la FK
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'defense_sessions'
      ) THEN
        ALTER TABLE final_grades 
          ADD COLUMN defense_session_id UUID REFERENCES defense_sessions(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_final_grades_defense_session ON final_grades(defense_session_id);
        
        RAISE NOTICE '✅ Colonne defense_session_id ajoutée à final_grades avec FK';
      ELSE
        -- Ajouter la colonne sans FK si defense_sessions n'existe pas
        ALTER TABLE final_grades 
          ADD COLUMN defense_session_id UUID;
        
        CREATE INDEX idx_final_grades_defense_session ON final_grades(defense_session_id);
        
        RAISE WARNING '⚠️ Colonne defense_session_id ajoutée à final_grades SANS FK (defense_sessions n''existe pas)';
      END IF;
    ELSE
      RAISE NOTICE '✅ Colonne defense_session_id existe déjà dans final_grades';
    END IF;
  ELSE
    RAISE WARNING '⚠️ Table final_grades non trouvée - correction ignorée';
  END IF;
END $$;


-- ===== CORRECTION 3: themes ↔ thesis_topics =====
-- Problème: Confusion entre thesis_topics (sujets proposés) et themes (sujets choisis)
-- Solution: Ajouter une relation explicite

DO $$ 
BEGIN
  -- Vérifier si themes est une table (pas une vue)
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'themes'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'themes' 
        AND column_name = 'thesis_topic_id'
    ) THEN
      ALTER TABLE themes 
        ADD COLUMN thesis_topic_id UUID REFERENCES thesis_topics(id) ON DELETE SET NULL;
      
      CREATE INDEX idx_themes_thesis_topic ON themes(thesis_topic_id);
      
      RAISE NOTICE '✅ Colonne thesis_topic_id ajoutée à themes';
    ELSE
      RAISE NOTICE '✅ Colonne thesis_topic_id existe déjà dans themes';
    END IF;
  ELSE
    RAISE WARNING '⚠️ themes est une vue, pas une table - correction ignorée';
  END IF;
END $$;


-- ===== CORRECTION 4: defense_sessions ↔ themes =====
-- Problème: defense_sessions.theme_id devrait être plus clair

DO $$ 
BEGIN
  -- Vérifier si la table defense_sessions existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_sessions'
  ) THEN
    -- Vérifier si la colonne theme_id existe et la renommer en thesis_id pour plus de clarté
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'defense_sessions' 
        AND column_name = 'theme_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'defense_sessions' 
        AND column_name = 'thesis_id'
    ) THEN
      ALTER TABLE defense_sessions RENAME COLUMN theme_id TO thesis_id;
      RAISE NOTICE '✅ Colonne theme_id renommée en thesis_id dans defense_sessions';
    ELSE
      RAISE NOTICE '✅ Colonne thesis_id existe déjà dans defense_sessions';
    END IF;
  ELSE
    RAISE WARNING '⚠️ Table defense_sessions non trouvée - correction ignorée';
  END IF;
END $$;


-- ===== CORRECTION 5: supervisor_assignments ↔ themes =====
-- Problème: Incohérence possible entre encadreur assigné et encadreur du thème
-- Solution: Ajouter un trigger de validation

CREATE OR REPLACE FUNCTION validate_supervisor_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_theme_supervisor_id UUID;
BEGIN
  -- Vérifier si l'étudiant a un thème
  SELECT supervisor_id INTO v_theme_supervisor_id
  FROM themes
  WHERE student_id = NEW.student_id
  LIMIT 1;
  
  -- Si un thème existe avec un encadreur différent, mettre à jour le thème
  IF v_theme_supervisor_id IS NOT NULL AND v_theme_supervisor_id != NEW.supervisor_id THEN
    UPDATE themes
    SET supervisor_id = NEW.supervisor_id,
        updated_at = NOW()
    WHERE student_id = NEW.student_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_supervisor_assignment ON supervisor_assignments;
CREATE TRIGGER trigger_validate_supervisor_assignment
  AFTER INSERT OR UPDATE ON supervisor_assignments
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE)
  EXECUTE FUNCTION validate_supervisor_assignment();


-- ===== CORRECTION 6: report_submissions ↔ themes =====
-- Ajouter une relation directe pour faciliter les requêtes

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_submissions' AND column_name = 'theme_id'
  ) THEN
    ALTER TABLE report_submissions 
      ADD COLUMN theme_id UUID REFERENCES themes(id) ON DELETE CASCADE;
    
    CREATE INDEX idx_report_submissions_theme ON report_submissions(theme_id);
  END IF;
END $$;

COMMENT ON COLUMN report_submissions.theme_id IS 'Référence vers le thème associé à cette soumission';


-- ===== CORRECTION 7: defense_jury_members ↔ profiles =====
-- S'assurer que les membres du jury ont le bon rôle

DO $$
BEGIN
  -- Vérifier si la table defense_jury_members existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_jury_members'
  ) THEN
    -- Créer la fonction de validation
    CREATE OR REPLACE FUNCTION validate_jury_member()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_has_jury_role BOOLEAN;
    BEGIN
      -- Vérifier si le membre a le rôle jury ou supervisor
      SELECT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = NEW.jury_member_id
          AND role IN ('jury', 'supervisor', 'department_head')
      ) INTO v_has_jury_role;
      
      IF NOT v_has_jury_role THEN
        RAISE EXCEPTION 'Le membre du jury doit avoir le rôle jury, supervisor ou department_head';
      END IF;
      
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    -- Créer le trigger
    DROP TRIGGER IF EXISTS trigger_validate_jury_member ON defense_jury_members;
    CREATE TRIGGER trigger_validate_jury_member
      BEFORE INSERT OR UPDATE ON defense_jury_members
      FOR EACH ROW
      EXECUTE FUNCTION validate_jury_member();
    
    RAISE NOTICE '✅ Trigger validate_jury_member créé sur defense_jury_members';
  ELSE
    RAISE WARNING '⚠️ Table defense_jury_members non trouvée - trigger non créé';
  END IF;
END $$;


-- ===== CORRECTION 8: Ajouter des contraintes d'intégrité =====

-- S'assurer qu'un étudiant ne peut avoir qu'un seul encadreur actif
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'supervisor_assignments'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_supervisor_per_student
      ON supervisor_assignments(student_id)
      WHERE is_active = TRUE;
    
    RAISE NOTICE '✅ Index unique encadreur actif créé';
  END IF;
END $$;

-- S'assurer qu'un étudiant ne peut avoir qu'un seul thème actif
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'themes'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_theme_per_student
      ON themes(student_id)
      WHERE status NOT IN ('rejected', 'archived');
    
    RAISE NOTICE '✅ Index unique thème actif créé';
  ELSE
    RAISE WARNING '⚠️ themes est une vue ou n''existe pas - index non créé';
  END IF;
END $$;

-- S'assurer qu'une soutenance ne peut avoir qu'un seul président de jury
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_jury_members'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_jury_president_per_defense
      ON defense_jury_members(defense_session_id)
      WHERE role = 'president';
    
    RAISE NOTICE '✅ Index unique président de jury créé';
  END IF;
END $$;


-- ===== CORRECTION 9: Ajouter des colonnes manquantes =====

-- Ajouter department_id à defense_sessions si manquant (pour filtrage RLS)
DO $$ 
BEGIN
  -- Vérifier si la table defense_sessions existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_sessions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'defense_sessions' 
        AND column_name = 'department_id'
    ) THEN
      ALTER TABLE defense_sessions 
        ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE CASCADE;
      
      -- Remplir avec les données existantes
      UPDATE defense_sessions ds
      SET department_id = p.department_id
      FROM profiles p
      WHERE ds.student_id = p.id
        AND ds.department_id IS NULL;
      
      CREATE INDEX idx_defense_sessions_department ON defense_sessions(department_id);
      
      RAISE NOTICE '✅ Colonne department_id ajoutée à defense_sessions';
    ELSE
      RAISE NOTICE '✅ Colonne department_id existe déjà dans defense_sessions';
    END IF;
  ELSE
    RAISE WARNING '⚠️ Table defense_sessions non trouvée - correction ignorée';
  END IF;
END $$;


-- ===== CORRECTION 10: Fonction helper pour vérifier la cohérence des données =====

CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Vérifier les étudiants sans encadreur
  RETURN QUERY
  SELECT 
    'Students without supervisor'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
    'Found ' || COUNT(*) || ' students without active supervisor'::TEXT
  FROM profiles p
  WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = 'student')
    AND NOT EXISTS (
      SELECT 1 FROM supervisor_assignments 
      WHERE student_id = p.id AND is_active = TRUE
    );
  
  -- Vérifier les thèmes sans encadreur
  RETURN QUERY
  SELECT 
    'Themes without supervisor'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
    'Found ' || COUNT(*) || ' themes without supervisor'::TEXT
  FROM themes
  WHERE supervisor_id IS NULL
    AND status NOT IN ('rejected', 'archived');
  
  -- Vérifier les soutenances sans jury
  RETURN QUERY
  SELECT 
    'Defenses without jury'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END::TEXT,
    'Found ' || COUNT(*) || ' defense sessions without jury members'::TEXT
  FROM defense_sessions ds
  WHERE NOT EXISTS (
    SELECT 1 FROM defense_jury_members 
    WHERE defense_session_id = ds.id
  )
  AND ds.status != 'cancelled';
  
  -- Vérifier les rapports de plagiat orphelins
  RETURN QUERY
  SELECT 
    'Orphan plagiarism reports'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
    'Found ' || COUNT(*) || ' plagiarism reports without submission'::TEXT
  FROM plagiarism_reports
  WHERE report_submission_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Pour annuler cette migration, exécuter:
/*
DROP FUNCTION IF EXISTS check_data_integrity();
DROP INDEX IF EXISTS idx_unique_jury_president_per_defense;
DROP INDEX IF EXISTS idx_unique_active_theme_per_student;
DROP INDEX IF EXISTS idx_unique_active_supervisor_per_student;
DROP TRIGGER IF EXISTS trigger_validate_jury_member ON defense_jury_members;
DROP FUNCTION IF EXISTS validate_jury_member();
DROP TRIGGER IF EXISTS trigger_validate_supervisor_assignment ON supervisor_assignments;
DROP FUNCTION IF EXISTS validate_supervisor_assignment();

-- Restaurer les colonnes originales (si nécessaire)
-- ALTER TABLE defense_sessions RENAME COLUMN thesis_id TO theme_id;
-- ALTER TABLE themes DROP COLUMN IF EXISTS thesis_topic_id;
-- ALTER TABLE final_grades DROP COLUMN IF EXISTS defense_session_id;
-- ALTER TABLE plagiarism_reports DROP COLUMN IF EXISTS report_submission_id;
-- ALTER TABLE report_submissions DROP COLUMN IF EXISTS theme_id;
-- ALTER TABLE defense_sessions DROP COLUMN IF EXISTS department_id;
*/
