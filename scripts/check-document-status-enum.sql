-- Vérifier les valeurs de l'énumération document_status
SELECT
  e.enumlabel as status_value,
  e.enumsortorder as sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'document_status'
ORDER BY e.enumsortorder;
