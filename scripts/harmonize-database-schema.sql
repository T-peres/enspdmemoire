-- Script d'harmonisation de la base de données
-- Synchronise les données entre thesis_topics et themes pour tous les rôles

-- =====================================================
-- ÉTAPE 1: Analyse de la situation actuelle
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '📊 ANALYSE DE LA BASE DE DONNÉES';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

-- Vérifier l'existence des tables
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    ) THEN '✓ Existe'
    ELSE '✗ Manquante'
  END as statut
FROM (
  VALUES 
    ('thesis_topics'),
    ('themes'),
    ('topic_selections'),
    ('supervisor_assignments'),
    ('fiche_suivi'),
    ('documents'),
    ('profiles'),
    ('departments')
) AS t(table_name);

-- =====================================================
-- ÉTAPE 2: Créer une vue unifiée des sujets/thèmes
-- =====================================================

-- Vue qui unifie thesis_topics et themes
CREATE OR REPLACE VIEW unified_topics AS
SELECT 
  COALESCE(tt.id, t.id) as id,
  COALESCE(tt.title, t.title) as title,
  COALESCE(tt.description, t.description) as description,
  COALESCE(tt.department_id, t.department_id) as department_id,
  COALESCE(tt.supervisor_id, t.supervisor_id) as supervisor_id,
  COALESCE(tt.status, t.status) as status,
  COALESCE(tt.max_students, 1) as max_students,
  COALESCE(tt.current_students, 0) as current_students,
  CASE 
    WHEN tt.id IS NOT NULL THEN 'thesis_topics'
    ELSE 'themes'
  END as source_table,
  COALESCE(tt.created_at, t.created_at) as created_at,
  COALESCE(tt.updated_at, t.updated_at) as updated_at
FROM thesis_topics tt
FULL OUTER JOIN themes t ON tt.id = t.id;

COMMENT ON VIEW unified_topics IS 'Vue unifiée des sujets de thèse provenant de thesis_topics et themes';

-- =====================================================
-- ÉTAPE 3: Fonction de synchronisation
-- =====================================================

CREATE OR REPLACE FUNCTION sync_thesis_topics_to_themes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_synced_count INTEGER := 0;
  v_topic RECORD;
BEGIN
  -- Synchroniser les thesis_topics approuvés vers themes
  FOR v_topic IN 
    SELECT * FROM thesis_topics 
    WHERE status = 'approved' 
      AND NOT EXISTS (SELECT 1 FROM themes WHERE id = thesis_topics.id)
  LOOP
    INSERT INTO themes (
      id,
      title,
      description,
      department_id,
      supervisor_id,
      student_id,
      status,
      created_at,
      updated_at
    )
    VALUES (
      v_topic.id,
      v_topic.title,
      v_topic.description,
      v_topic.department_id,
      v_topic.supervisor_id,
      NULL, -- student_id sera rempli lors de la sélection
      v_topic.status,
      v_topic.created_at,
      v_topic.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      updated_at = NOW();
    
    v_synced_count := v_synced_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Synchronisé % sujet(s) de thesis_topics vers themes', v_synced_count;
END;
$$;

-- =====================================================
-- ÉTAPE 4: Fonction pour lier les sélections aux thèmes
-- =====================================================

CREATE OR REPLACE FUNCTION link_selections_to_themes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_linked_count INTEGER := 0;
  v_selection RECORD;
BEGIN
  -- Pour chaque sélection confirmée, mettre à jour le thème
  FOR v_selection IN 
    SELECT * FROM topic_selections 
    WHERE status = 'confirmed'
  LOOP
    -- Mettre à jour ou créer le thème
    INSERT INTO themes (
      id,
      title,
      description,
      department_id,
      supervisor_id,
      student_id,
      status,
      created_at,
      updated_at
    )
    SELECT 
      tt.id,
      tt.title,
      tt.description,
      tt.department_id,
      tt.supervisor_id,
      v_selection.student_id,
      'approved',
      tt.created_at,
      NOW()
    FROM thesis_topics tt
    WHERE tt.id = v_selection.topic_id
    ON CONFLICT (id) DO UPDATE SET
      student_id = EXCLUDED.student_id,
      updated_at = NOW();
    
    v_linked_count := v_linked_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Lié % sélection(s) aux thèmes', v_linked_count;
END;
$$;

-- =====================================================
-- ÉTAPE 5: Fonction pour synchroniser les attributions
-- =====================================================

CREATE OR REPLACE FUNCTION sync_supervisor_assignments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_synced_count INTEGER := 0;
  v_theme RECORD;
BEGIN
  -- Pour chaque thème avec étudiant et superviseur, créer une attribution
  FOR v_theme IN 
    SELECT * FROM themes 
    WHERE student_id IS NOT NULL 
      AND supervisor_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM supervisor_assignments 
        WHERE student_id = themes.student_id 
          AND supervisor_id = themes.supervisor_id
          AND is_active = TRUE
      )
  LOOP
    INSERT INTO supervisor_assignments (
      student_id,
      supervisor_id,
      theme_id,
      assigned_by,
      assigned_at,
      is_active
    )
    VALUES (
      v_theme.student_id,
      v_theme.supervisor_id,
      v_theme.id,
      v_theme.supervisor_id, -- Auto-attribution
      NOW(),
      TRUE
    )
    ON CONFLICT DO NOTHING;
    
    v_synced_count := v_synced_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Synchronisé % attribution(s)', v_synced_count;
END;
$$;

-- =====================================================
-- ÉTAPE 6: Fonction principale de synchronisation
-- =====================================================

CREATE OR REPLACE FUNCTION harmonize_all_data()
RETURNS TABLE (
  step TEXT,
  status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Étape 1: Sync thesis_topics -> themes
  BEGIN
    PERFORM sync_thesis_topics_to_themes();
    RETURN QUERY SELECT 
      'Sync Topics'::TEXT, 
      'SUCCESS'::TEXT, 
      'Sujets synchronisés'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Sync Topics'::TEXT, 
      'ERROR'::TEXT, 
      SQLERRM::TEXT;
  END;
  
  -- Étape 2: Link selections -> themes
  BEGIN
    PERFORM link_selections_to_themes();
    RETURN QUERY SELECT 
      'Link Selections'::TEXT, 
      'SUCCESS'::TEXT, 
      'Sélections liées'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Link Selections'::TEXT, 
      'ERROR'::TEXT, 
      SQLERRM::TEXT;
  END;
  
  -- Étape 3: Sync supervisor assignments
  BEGIN
    PERFORM sync_supervisor_assignments();
    RETURN QUERY SELECT 
      'Sync Assignments'::TEXT, 
      'SUCCESS'::TEXT, 
      'Attributions synchronisées'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Sync Assignments'::TEXT, 
      'ERROR'::TEXT, 
      SQLERRM::TEXT;
  END;
  
  RETURN;
END;
$$;

-- =====================================================
-- ÉTAPE 7: Créer un trigger pour synchronisation auto
-- =====================================================

-- Trigger sur topic_selections
CREATE OR REPLACE FUNCTION trigger_sync_on_selection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Créer ou mettre à jour le thème
    INSERT INTO themes (
      id, title, description, department_id, supervisor_id, student_id, status, created_at, updated_at
    )
    SELECT 
      tt.id, tt.title, tt.description, tt.department_id, tt.supervisor_id, 
      NEW.student_id, 'approved', tt.created_at, NOW()
    FROM thesis_topics tt
    WHERE tt.id = NEW.topic_id
    ON CONFLICT (id) DO UPDATE SET
      student_id = EXCLUDED.student_id,
      updated_at = NOW();
    
    -- Créer l'attribution si superviseur présent
    INSERT INTO supervisor_assignments (
      student_id, supervisor_id, theme_id, assigned_by, assigned_at, is_active
    )
    SELECT 
      NEW.student_id, tt.supervisor_id, tt.id, tt.supervisor_id, NOW(), TRUE
    FROM thesis_topics tt
    WHERE tt.id = NEW.topic_id AND tt.supervisor_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_selection_to_theme ON topic_selections;
CREATE TRIGGER trigger_sync_selection_to_theme
  AFTER INSERT OR UPDATE ON topic_selections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_on_selection();

-- =====================================================
-- ÉTAPE 8: Accorder les permissions
-- =====================================================

GRANT SELECT ON unified_topics TO authenticated;
GRANT EXECUTE ON FUNCTION sync_thesis_topics_to_themes TO authenticated;
GRANT EXECUTE ON FUNCTION link_selections_to_themes TO authenticated;
GRANT EXECUTE ON FUNCTION sync_supervisor_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION harmonize_all_data TO authenticated;

-- =====================================================
-- ÉTAPE 9: Exécuter la synchronisation initiale
-- =====================================================

SELECT * FROM harmonize_all_data();

-- =====================================================
-- ÉTAPE 10: Rapport final
-- =====================================================

DO $$
DECLARE
  v_topics_count INTEGER;
  v_themes_count INTEGER;
  v_selections_count INTEGER;
  v_assignments_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_topics_count FROM thesis_topics;
  SELECT COUNT(*) INTO v_themes_count FROM themes;
  SELECT COUNT(*) INTO v_selections_count FROM topic_selections WHERE status = 'confirmed';
  SELECT COUNT(*) INTO v_assignments_count FROM supervisor_assignments WHERE is_active = TRUE;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ HARMONISATION TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistiques:';
  RAISE NOTICE '  • Sujets (thesis_topics): %', v_topics_count;
  RAISE NOTICE '  • Thèmes (themes): %', v_themes_count;
  RAISE NOTICE '  • Sélections confirmées: %', v_selections_count;
  RAISE NOTICE '  • Attributions actives: %', v_assignments_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Fonctionnalités activées:';
  RAISE NOTICE '  • Vue unifiée: unified_topics';
  RAISE NOTICE '  • Sync automatique via triggers';
  RAISE NOTICE '  • Fonction manuelle: SELECT * FROM harmonize_all_data()';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Tous les dashboards sont maintenant synchronisés';
END $$;
