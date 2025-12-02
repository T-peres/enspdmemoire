-- =====================================================
-- Script de Diagnostic - Table themes
-- Description: Vérifier si themes est une table ou une vue
-- =====================================================

-- Vérifier le type de themes
SELECT 
  table_name,
  table_type,
  CASE table_type
    WHEN 'BASE TABLE' THEN '✅ C''est une table - OK'
    WHEN 'VIEW' THEN '⚠️ C''est une vue - Problème pour les foreign keys'
    ELSE '❓ Type inconnu'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'themes';

-- Si c'est une vue, trouver la table sous-jacente
DO $$
DECLARE
  v_is_view BOOLEAN;
  v_view_definition TEXT;
BEGIN
  SELECT table_type = 'VIEW' INTO v_is_view
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'themes';
  
  IF v_is_view THEN
    SELECT view_definition INTO v_view_definition
    FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'themes';
    
    RAISE NOTICE 'themes est une vue. Définition:';
    RAISE NOTICE '%', v_view_definition;
  END IF;
END $$;

-- Lister toutes les tables qui pourraient être liées aux thèmes
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%theme%' 
    OR table_name LIKE '%thesis%'
    OR table_name LIKE '%topic%'
  )
ORDER BY table_type, table_name;

-- Vérifier les colonnes de themes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'themes'
ORDER BY ordinal_position;
