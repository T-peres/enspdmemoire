-- Ajouter toutes les clés étrangères manquantes

-- =====================================================
-- 1. Ajouter theme_id à supervisor_assignments si manquant
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'supervisor_assignments' 
      AND column_name = 'theme_id'
  ) THEN
    -- Référencer thesis_topics au lieu de themes (qui est une vue)
    ALTER TABLE supervisor_assignments 
    ADD COLUMN theme_id UUID REFERENCES thesis_topics(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_theme_id 
    ON supervisor_assignments(theme_id);
    
    RAISE NOTICE '✅ Colonne theme_id ajoutée à supervisor_assignments';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne theme_id existe déjà dans supervisor_assignments';
  END IF;
END $$;

-- =====================================================
-- 2. Synchroniser les données existantes
-- =====================================================

-- Mettre à jour theme_id depuis thesis_topics
UPDATE supervisor_assignments sa
SET theme_id = tt.id
FROM thesis_topics tt
WHERE sa.student_id = tt.student_id
  AND sa.supervisor_id = tt.supervisor_id
  AND sa.theme_id IS NULL
  AND tt.student_id IS NOT NULL;

-- =====================================================
-- 3. Afficher les relations de supervisor_assignments
-- =====================================================

SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'supervisor_assignments'
ORDER BY tc.constraint_name;

-- =====================================================
-- 4. Rafraîchir le cache du schéma
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- 5. Rapport final
-- =====================================================

DO $$
DECLARE
  v_with_theme INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM supervisor_assignments;
  SELECT COUNT(*) INTO v_with_theme FROM supervisor_assignments WHERE theme_id IS NOT NULL;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Clés étrangères ajoutées';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistiques supervisor_assignments:';
  RAISE NOTICE '  • Total: %', v_total;
  RAISE NOTICE '  • Avec theme_id: %', v_with_theme;
  RAISE NOTICE '  • Sans theme_id: %', v_total - v_with_theme;
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Cache du schéma rechargé';
  RAISE NOTICE '🔄 Rafraîchissez votre application (Ctrl+F5)';
END $$;
