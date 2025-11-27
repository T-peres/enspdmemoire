-- =====================================================
-- VÉRIFIER LA STRUCTURE DE thesis_topics
-- =====================================================

-- 1. Vérifier si la table existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thesis_topics') 
    THEN '✓ Table "thesis_topics" existe'
    ELSE '✗ Table "thesis_topics" n''existe pas'
  END as status;

-- 2. Lister toutes les colonnes de thesis_topics
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'thesis_topics'
ORDER BY ordinal_position;

-- 3. Vérifier les colonnes requises par l'application
DO $$
DECLARE
  v_has_proposed_by BOOLEAN;
  v_has_current_students BOOLEAN;
  v_has_max_students BOOLEAN;
  v_has_student_id BOOLEAN;
BEGIN
  -- Vérifier proposed_by
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' AND column_name = 'proposed_by'
  ) INTO v_has_proposed_by;

  -- Vérifier current_students
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' AND column_name = 'current_students'
  ) INTO v_has_current_students;

  -- Vérifier max_students
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' AND column_name = 'max_students'
  ) INTO v_has_max_students;

  -- Vérifier student_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' AND column_name = 'student_id'
  ) INTO v_has_student_id;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC DES COLONNES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  IF v_has_proposed_by THEN
    RAISE NOTICE '✓ Colonne "proposed_by" existe';
  ELSE
    RAISE NOTICE '✗ Colonne "proposed_by" MANQUANTE';
  END IF;

  IF v_has_current_students THEN
    RAISE NOTICE '✓ Colonne "current_students" existe';
  ELSE
    RAISE NOTICE '✗ Colonne "current_students" MANQUANTE';
  END IF;

  IF v_has_max_students THEN
    RAISE NOTICE '✓ Colonne "max_students" existe';
  ELSE
    RAISE NOTICE '✗ Colonne "max_students" MANQUANTE';
  END IF;

  IF v_has_student_id THEN
    RAISE NOTICE '✓ Colonne "student_id" existe';
  ELSE
    RAISE NOTICE '✗ Colonne "student_id" MANQUANTE';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RECOMMANDATION :';
  RAISE NOTICE '';

  IF NOT v_has_proposed_by OR NOT v_has_current_students OR NOT v_has_max_students THEN
    RAISE NOTICE 'Des colonnes sont manquantes !';
    RAISE NOTICE 'Exécutez le script: scripts/add-missing-columns.sql';
  ELSIF NOT v_has_student_id THEN
    RAISE NOTICE 'Votre table utilise "proposed_by" au lieu de "student_id"';
    RAISE NOTICE 'C''est normal, mais il faut ajouter "student_id" comme alias';
  ELSE
    RAISE NOTICE 'Toutes les colonnes requises sont présentes !';
  END IF;

  RAISE NOTICE '========================================';
END $$;
