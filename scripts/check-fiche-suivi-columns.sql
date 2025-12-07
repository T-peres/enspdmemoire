-- Vérifier les colonnes de la table fiche_suivi

SELECT 
  '📋 COLONNES DE fiche_suivi' as titre,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'fiche_suivi'
ORDER BY ordinal_position;
