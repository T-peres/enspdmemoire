-- Renommer les contraintes de clés étrangères pour correspondre au nom de la table
-- Les contraintes utilisent encore "themes_" alors que la table s'appelle "thesis_topics"

-- Note: PostgreSQL ne permet pas de renommer directement les contraintes
-- Il faut les supprimer et les recréer

-- 1. Supprimer les anciennes contraintes avec le préfixe "themes_"
ALTER TABLE thesis_topics DROP CONSTRAINT IF EXISTS themes_student_id_fkey;
ALTER TABLE thesis_topics DROP CONSTRAINT IF EXISTS themes_supervisor_id_fkey;
ALTER TABLE thesis_topics DROP CONSTRAINT IF EXISTS themes_reviewed_by_fkey;
ALTER TABLE thesis_topics DROP CONSTRAINT IF EXISTS themes_previous_version_id_fkey;

-- 2. Recréer les contraintes avec le bon nom
ALTER TABLE thesis_topics 
  ADD CONSTRAINT thesis_topics_student_id_fkey 
  FOREIGN KEY (student_id) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

ALTER TABLE thesis_topics 
  ADD CONSTRAINT thesis_topics_supervisor_id_fkey 
  FOREIGN KEY (supervisor_id) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

ALTER TABLE thesis_topics 
  ADD CONSTRAINT thesis_topics_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

ALTER TABLE thesis_topics 
  ADD CONSTRAINT thesis_topics_previous_version_id_fkey 
  FOREIGN KEY (previous_version_id) 
  REFERENCES thesis_topics(id) 
  ON DELETE SET NULL;

-- Vérifier les nouvelles contraintes
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
  AND tc.table_name = 'thesis_topics'
ORDER BY tc.constraint_name;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Contraintes de clés étrangères renommées';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Contraintes mises à jour:';
  RAISE NOTICE '  • themes_student_id_fkey → thesis_topics_student_id_fkey';
  RAISE NOTICE '  • themes_supervisor_id_fkey → thesis_topics_supervisor_id_fkey';
  RAISE NOTICE '  • themes_reviewed_by_fkey → thesis_topics_reviewed_by_fkey';
  RAISE NOTICE '  • themes_previous_version_id_fkey → thesis_topics_previous_version_id_fkey';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Les requêtes avec thesis_topics!student_id devraient maintenant fonctionner';
  RAISE NOTICE '🔄 Rafraîchissez votre application (Ctrl+F5)';
END $$;
