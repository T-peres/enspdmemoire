-- =====================================================
-- SCRIPT D'IMPLÉMENTATION DES RELATIONS COMPLÈTES
-- À exécuter dans Supabase Studio SQL Editor
-- =====================================================

-- ÉTAPE 1: Renommer themes en thesis_topics si nécessaire
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thesis_topics') THEN
    
    RAISE NOTICE 'Renommage de themes en thesis_topics...';
    ALTER TABLE themes RENAME TO thesis_topics;
    ALTER INDEX IF EXISTS idx_themes_student RENAME TO idx_thesis_topics_student;
    ALTER INDEX IF EXISTS idx_themes_supervisor RENAME TO idx_thesis_topics_supervisor;
    ALTER INDEX IF EXISTS idx_themes_status RENAME TO idx_thesis_topics_status;
  END IF;
END $$;

-- ÉTAPE 2: Ajouter colonnes à thesis_topics
ALTER TABLE thesis_topics ADD COLUMN IF NOT EXISTS keywords TEXT[];
ALTER TABLE thesis_topics ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES profiles(id);
ALTER TABLE thesis_topics ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE thesis_topics ADD COLUMN IF NOT EXISTS chosen_by_student_id UUID REFERENCES profiles(id);
ALTER TABLE thesis_topics ADD COLUMN IF NOT EXISTS chosen_at TIMESTAMPTZ;
ALTER TABLE thesis_topics ADD COLUMN IF NOT EXISTS validated_by_head BOOLEAN DEFAULT FALSE;
ALTER TABLE thesis_topics ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE thesis_topics ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES profiles(id);
ALTER TABLE thesis_topics ADD COLUMN IF NOT EXISTS validation_notes TEXT;

-- Index
CREATE INDEX IF NOT EXISTS idx_thesis_topics_chosen_student ON thesis_topics(chosen_by_student_id);
CREATE INDEX IF NOT EXISTS idx_thesis_topics_locked ON thesis_topics(is_locked);

