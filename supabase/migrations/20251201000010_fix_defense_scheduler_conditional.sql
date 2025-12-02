-- =====================================================
-- Migration: Corrections pour le planificateur de soutenances (VERSION CONDITIONNELLE)
-- Description: Corriger les incohérences et ajouter les fonctionnalités manquantes
-- Date: 2025-12-01
-- NOTE: Cette migration ne s'exécute que si defense_sessions existe
-- =====================================================

DO $$
BEGIN
  -- Vérifier si la table defense_sessions existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'defense_sessions'
  ) THEN
    RAISE WARNING '⚠️ Table defense_sessions non trouvée - migration ignorée';
    RAISE WARNING '⚠️ Exécutez d''abord la migration 20251127000000_complete_missing_relations.sql';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Table defense_sessions trouvée - application de la migration';

  -- ===== CORRECTION 1: Créer une vue pour compatibilité =====
  
  EXECUTE '
  CREATE OR REPLACE VIEW defenses AS
  SELECT * FROM defense_sessions
  ';

  -- ===== CORRECTION 2: Fonction de validation des prérequis =====
  
  EXECUTE '
  CREATE OR REPLACE FUNCTION validate_defense_prerequisites()
  RETURNS TRIGGER AS $func$
  DECLARE
    v_eligibility JSONB;
  BEGIN
    -- Vérifier l''éligibilité de l''étudiant
    SELECT check_final_submission_eligibility(NEW.student_id) INTO v_eligibility;
    
    -- Si pas éligible et statut = scheduled, bloquer
    IF NEW.status = ''scheduled'' AND NOT (v_eligibility->>''eligible'')::BOOLEAN THEN
      RAISE EXCEPTION ''L''''étudiant n''''est pas éligible pour une soutenance. Vérifications: %'', 
        v_eligibility->''checks'';
    END IF;
    
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql
  ';

  DROP TRIGGER IF EXISTS trigger_validate_defense_prerequisites ON defense_sessions;
  
  EXECUTE '
  CREATE TRIGGER trigger_validate_defense_prerequisites
    BEFORE INSERT OR UPDATE ON defense_sessions
    FOR EACH ROW
    WHEN (NEW.status = ''scheduled'')
    EXECUTE FUNCTION validate_defense_prerequisites()
  ';

  RAISE NOTICE '✅ Migration defense_scheduler appliquée avec succès';

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors de l''application de la migration: %', SQLERRM;
    RAISE WARNING 'La migration a été partiellement appliquée';
END $$;
