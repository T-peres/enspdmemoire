-- Ajouter la colonne student_id à thesis_topics si elle n'existe pas
-- Cela permet de lier directement un étudiant à un sujet (optionnel)

-- Vérifier si la colonne existe déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' 
      AND column_name = 'student_id'
  ) THEN
    -- Ajouter la colonne
    ALTER TABLE thesis_topics 
    ADD COLUMN student_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    
    -- Créer un index
    CREATE INDEX idx_thesis_topics_student_id ON thesis_topics(student_id);
    
    RAISE NOTICE '✅ Colonne student_id ajoutée à thesis_topics';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne student_id existe déjà dans thesis_topics';
  END IF;
END $$;

-- Ajouter une colonne chosen_by_student_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thesis_topics' 
      AND column_name = 'chosen_by_student_id'
  ) THEN
    ALTER TABLE thesis_topics 
    ADD COLUMN chosen_by_student_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_thesis_topics_chosen_by_student_id ON thesis_topics(chosen_by_student_id);
    
    RAISE NOTICE '✅ Colonne chosen_by_student_id ajoutée à thesis_topics';
  ELSE
    RAISE NOTICE 'ℹ️  Colonne chosen_by_student_id existe déjà dans thesis_topics';
  END IF;
END $$;

-- Synchroniser les données depuis topic_selections
UPDATE thesis_topics tt
SET student_id = ts.student_id
FROM topic_selections ts
WHERE tt.id = ts.topic_id
  AND ts.status = 'confirmed'
  AND tt.student_id IS NULL;

-- Afficher les colonnes de thesis_topics
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'thesis_topics'
ORDER BY ordinal_position;

-- Afficher les clés étrangères
SELECT
  tc.constraint_name,
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
  AND tc.table_name = 'thesis_topics'
ORDER BY tc.constraint_name;

-- Message final
DO $$
DECLARE
  v_with_student INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM thesis_topics;
  SELECT COUNT(*) INTO v_with_student FROM thesis_topics WHERE student_id IS NOT NULL;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Relations thesis_topics mises à jour';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistiques:';
  RAISE NOTICE '  • Total sujets: %', v_total;
  RAISE NOTICE '  • Sujets avec étudiant: %', v_with_student;
  RAISE NOTICE '  • Sujets disponibles: %', v_total - v_with_student;
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Rafraîchissez votre application';
END $$;
