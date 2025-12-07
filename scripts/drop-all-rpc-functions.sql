-- Script pour supprimer toutes les fonctions RPC existantes
-- Exécutez ce script AVANT create-all-missing-rpc-functions.sql si vous avez des conflits

-- Supprimer toutes les versions possibles des fonctions
-- Utiliser une requête dynamique pour supprimer toutes les surcharges

DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Supprimer toutes les versions de create_notification
  FOR func_record IN 
    SELECT p.oid::regprocedure as func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'create_notification'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_signature || ' CASCADE';
    RAISE NOTICE 'Supprimé: %', func_record.func_signature;
  END LOOP;

  -- Supprimer toutes les versions de create_alert
  FOR func_record IN 
    SELECT p.oid::regprocedure as func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'create_alert'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_signature || ' CASCADE';
    RAISE NOTICE 'Supprimé: %', func_record.func_signature;
  END LOOP;
END $$;

-- Supprimer les autres fonctions spécifiques
DROP FUNCTION IF EXISTS public.select_topic_atomic(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_department_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_supervisor_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.can_submit_final_report(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.can_submit_report(UUID) CASCADE;

-- Lister les fonctions restantes
SELECT 
  p.proname as "Fonction",
  pg_get_function_arguments(p.oid) as "Paramètres"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%topic%' 
   OR p.proname LIKE '%notification%'
   OR p.proname LIKE '%stats%'
   OR p.proname LIKE '%alert%'
   OR p.proname LIKE '%submit%'
ORDER BY p.proname;

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Toutes les fonctions RPC ont été supprimées';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Exécutez maintenant: scripts/create-all-missing-rpc-functions.sql';
END $$;
