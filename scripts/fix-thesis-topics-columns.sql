-- =====================================================
-- CORRIGER LA TABLE thesis_topics
-- Ajouter les colonnes manquantes
-- =====================================================

-- 1. Ajouter proposed_by (qui a proposé le thème)
ALTER TABLE thesis_topics 
ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES profiles(id);

-- Remplir proposed_by avec student_id pour les thèmes existants
UPDATE thesis_topics 
SET proposed_by = student_id 
WHERE proposed_by IS NULL;

-- 2. Ajouter department_id
ALTER TABLE thesis_topics 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- Remplir department_id depuis le profil de l'étudiant
UPDATE thesis_topics t
SET department_id = p.department_id
FROM profiles p
WHERE t.student_id = p.id AND t.department_id IS NULL;

-- 3. Ajouter current_students (nombre d'étudiants sur ce thème)
ALTER TABLE thesis_topics 
ADD COLUMN IF NOT EXISTS current_students INTEGER DEFAULT 0;

-- Mettre à 1 pour les thèmes existants (1 étudiant par thème)
UPDATE thesis_topics 
SET current_students = 1 
WHERE current_students = 0 AND student_id IS NOT NULL;

-- 4. Ajouter max_students (nombre maximum d'étudiants)
ALTER TABLE thesis_topics 
ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 1;

-- 5. Créer les index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_thesis_topics_proposed_by ON thesis_topics(proposed_by);
CREATE INDEX IF NOT EXISTS idx_thesis_topics_department ON thesis_topics(department_id);

-- 6. Vérification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COLONNES AJOUTÉES AVEC SUCCÈS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✓ proposed_by ajoutée';
  RAISE NOTICE '✓ department_id ajoutée';
  RAISE NOTICE '✓ current_students ajoutée';
  RAISE NOTICE '✓ max_students ajoutée';
  RAISE NOTICE '';
  RAISE NOTICE 'Prochaines étapes :';
  RAISE NOTICE '1. Rechargez l''application (Ctrl+Shift+R)';
  RAISE NOTICE '2. Les erreurs 400 devraient disparaître';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- 7. Afficher la structure finale
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'thesis_topics'
ORDER BY ordinal_position;
