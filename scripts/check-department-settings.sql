-- =====================================================
-- Script de Vérification - Table department_settings
-- =====================================================

-- Vérifier si la table existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'department_settings'
    ) THEN '✅ La table department_settings existe'
    ELSE '❌ La table department_settings n''existe pas'
  END as table_status;

-- Voir les colonnes existantes
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'department_settings'
ORDER BY ordinal_position;

-- Vérifier les contraintes
SELECT
  conname as constraint_name,
  CASE contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    ELSE contype::text
  END as constraint_type
FROM pg_constraint
WHERE conrelid = 'department_settings'::regclass;
