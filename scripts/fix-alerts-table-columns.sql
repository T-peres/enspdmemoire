-- Vérifier et standardiser les colonnes de la table alerts

-- 1. Vérifier les colonnes actuelles
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'alerts'
ORDER BY ordinal_position;

-- 2. Standardiser les noms de colonnes
-- Renommer 'read' en 'is_read' si nécessaire
DO $$
BEGIN
  -- Vérifier si la colonne 'read' existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'read'
  ) THEN
    -- Renommer 'read' en 'is_read'
    ALTER TABLE alerts RENAME COLUMN read TO is_read;
    RAISE NOTICE '✅ Colonne "read" renommée en "is_read"';
  END IF;
  
  -- Vérifier si is_read existe maintenant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'is_read'
  ) THEN
    -- Créer la colonne is_read si elle n'existe pas
    ALTER TABLE alerts ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Colonne "is_read" créée';
  END IF;
END $$;

-- 3. Vérifier student_id vs user_id
DO $$
BEGIN
  -- Si student_id existe mais pas user_id, renommer
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'student_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE alerts RENAME COLUMN student_id TO user_id;
    RAISE NOTICE '✅ Colonne "student_id" renommée en "user_id"';
  END IF;
  
  -- Si user_id n'existe toujours pas, la créer
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE alerts ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
    RAISE NOTICE '✅ Colonne "user_id" créée';
  END IF;
END $$;

-- 4. Créer un index sur is_read si nécessaire
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id_is_read ON alerts(user_id, is_read);

-- 5. Afficher la structure finale
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'alerts'
ORDER BY ordinal_position;

-- Message final
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Table alerts standardisée';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Colonnes standardisées:';
  RAISE NOTICE '  • user_id (au lieu de student_id)';
  RAISE NOTICE '  • is_read (au lieu de read)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Les requêtes sur alerts devraient maintenant fonctionner';
END $$;
