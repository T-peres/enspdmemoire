-- =====================================================
-- Script de Correction - Fonction create_alert
-- Description: Supprimer toutes les versions de create_alert
-- Usage: Exécuter avant la migration 1 si vous avez l'erreur
-- =====================================================

-- Supprimer toutes les variantes possibles de la fonction create_alert
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Trouver toutes les fonctions nommées create_alert
  FOR r IN 
    SELECT 
      p.oid::regprocedure as func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_alert'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    RAISE NOTICE 'Supprimé: %', r.func_signature;
  END LOOP;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Aucune fonction create_alert trouvée';
  END IF;
END $$;

-- Vérifier que la fonction a été supprimée
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Fonction create_alert supprimée avec succès'
    ELSE '❌ La fonction create_alert existe encore (' || COUNT(*) || ' variante(s))'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'create_alert';

-- Maintenant vous pouvez réexécuter la migration 1
