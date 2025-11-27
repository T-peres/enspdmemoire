-- =====================================================
-- AJOUTER LES COLONNES MANQUANTES À thesis_topics
-- =====================================================

-- Ce script ajoute les colonnes requises par l'application
-- si elles n'existent pas déjà

-- =====================================================
-- ÉTAPE 1 : Ajouter proposed_by (si manquant)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' AND column_name = 'proposed_by'
  ) THEN
    -- Si student_id existe, utiliser proposed_by comme alias
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'thesis_topics' AND column_name = 'student_id'
    ) THEN
      ALTER TABLE thesis_topics ADD COLUMN proposed_by UUID REFERENCES profiles(id);
      UPDATE thesis_topics SET proposed_by = student_id WHERE proposed_by IS NULL;
      RAISE NOTICE '✓ Colonne "proposed_by" ajoutée et remplie avec student_id';
    ELSE
      ALTER TABLE thesis_topics ADD COLUMN proposed_by UUID REFERENCES profiles(id);
      RAISE NOTICE '✓ Colonne "proposed_by" ajoutée';
    END IF;
  ELSE
    RAISE NOTICE '✓ Colonne "proposed_by" existe déjà';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 2 : Ajouter student_id (si manquant)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' AND column_name = 'student_id'
  ) THEN
    -- Si proposed_by existe, utiliser student_id comme alias
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'thesis_topics' AND column_name = 'proposed_by'
    ) THEN
      ALTER TABLE thesis_topics ADD COLUMN student_id UUID REFERENCES profiles(id);
      UPDATE thesis_topics SET student_id = proposed_by WHERE student_id IS NULL;
      RAISE NOTICE '✓ Colonne "student_id" ajoutée et remplie avec proposed_by';
    ELSE
      ALTER TABLE thesis_topics ADD COLUMN student_id UUID REFERENCES profiles(id);
      RAISE NOTICE '✓ Colonne "student_id" ajoutée';
    END IF;
  ELSE
    RAISE NOTICE '✓ Colonne "student_id" existe déjà';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 3 : Ajouter current_students
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' AND column_name = 'current_students'
  ) THEN
    ALTER TABLE thesis_topics ADD COLUMN current_students INTEGER DEFAULT 0;
    RAISE NOTICE '✓ Colonne "current_students" ajoutée';
  ELSE
    RAISE NOTICE '✓ Colonne "current_students" existe déjà';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 4 : Ajouter max_students
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' AND column_name = 'max_students'
  ) THEN
    ALTER TABLE thesis_topics ADD COLUMN max_students INTEGER DEFAULT 1;
    RAISE NOTICE '✓ Colonne "max_students" ajoutée';
  ELSE
    RAISE NOTICE '✓ Colonne "max_students" existe déjà';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 5 : Vérifier les autres colonnes essentielles
-- =====================================================

-- Ajouter department_id si manquant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE thesis_topics ADD COLUMN department_id UUID REFERENCES departments(id);
    RAISE NOTICE '✓ Colonne "department_id" ajoutée';
  ELSE
    RAISE NOTICE '✓ Colonne "department_id" existe déjà';
  END IF;
END $$;

-- Ajouter supervisor_id si manquant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' AND column_name = 'supervisor_id'
  ) THEN
    ALTER TABLE thesis_topics ADD COLUMN supervisor_id UUID REFERENCES profiles(id);
    RAISE NOTICE '✓ Colonne "supervisor_id" ajoutée';
  ELSE
    RAISE NOTICE '✓ Colonne "supervisor_id" existe déjà';
  END IF;
END $$;

-- =====================================================
-- ÉTAPE 6 : Résumé
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COLONNES AJOUTÉES AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes :';
  RAISE NOTICE '1. Rechargez l''application (Ctrl+Shift+R)';
  RAISE NOTICE '2. Les erreurs 400 devraient disparaître';
  RAISE NOTICE '3. Testez les fonctionnalités';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- ÉTAPE 7 : Afficher la structure finale
-- =====================================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'thesis_topics'
ORDER BY ordinal_position;
