-- =====================================================
-- Script de Nettoyage - Migrations Partielles
-- Description: Nettoyer les éléments partiellement créés
-- Usage: Exécuter UNIQUEMENT si une migration a échoué partiellement
-- =====================================================

-- ===== ATTENTION =====
-- Ce script supprime les éléments créés par les migrations
-- À utiliser UNIQUEMENT en cas d'échec partiel
-- Faire une SAUVEGARDE avant d'exécuter

-- ===== NETTOYAGE MIGRATION 1: ALERTS =====

-- Supprimer les politiques
DROP POLICY IF EXISTS "System can create alerts" ON alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;

-- Supprimer les fonctions (toutes les variantes possibles)
DROP FUNCTION IF EXISTS create_alert(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS create_alert(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_alert;
DROP FUNCTION IF EXISTS cleanup_expired_alerts();

-- Supprimer la table (CASCADE supprime aussi les index)
DROP TABLE IF EXISTS alerts CASCADE;

-- ===== NETTOYAGE MIGRATION 2: MEETINGS =====

DROP POLICY IF EXISTS "Students can sign own meetings" ON meetings;
DROP POLICY IF EXISTS "Supervisors can update own meetings" ON meetings;
DROP POLICY IF EXISTS "Supervisors can create meetings" ON meetings;
DROP POLICY IF EXISTS "Supervisors can view assigned meetings" ON meetings;
DROP POLICY IF EXISTS "Students can view own meetings" ON meetings;

DROP TRIGGER IF EXISTS trigger_meeting_scheduled_alert ON meetings;
DROP FUNCTION IF EXISTS trigger_meeting_scheduled_alert();
DROP TRIGGER IF EXISTS trigger_validate_meeting_signatures ON meetings;
DROP FUNCTION IF EXISTS validate_meeting_signatures();
DROP TRIGGER IF EXISTS trigger_update_meetings_updated_at ON meetings;
DROP FUNCTION IF EXISTS update_meetings_updated_at();

DROP FUNCTION IF EXISTS get_meeting_statistics(UUID, UUID);
DROP TABLE IF EXISTS meetings CASCADE;

-- ===== NETTOYAGE MIGRATION 3: DEPARTMENT_SETTINGS =====

DROP POLICY IF EXISTS "Admins can create settings" ON department_settings;
DROP POLICY IF EXISTS "Department heads can update own settings" ON department_settings;
DROP POLICY IF EXISTS "Department heads can view own settings" ON department_settings;

DROP TRIGGER IF EXISTS trigger_auto_create_department_settings ON departments;
DROP FUNCTION IF EXISTS auto_create_department_settings();
DROP FUNCTION IF EXISTS create_default_department_settings(UUID);
DROP TRIGGER IF EXISTS trigger_update_department_settings_updated_at ON department_settings;
DROP FUNCTION IF EXISTS update_department_settings_updated_at();

DROP FUNCTION IF EXISTS can_submit_report(UUID);
DROP FUNCTION IF EXISTS get_department_settings(UUID);
DROP TABLE IF EXISTS department_settings CASCADE;

-- ===== VÉRIFICATION =====

-- Vérifier que les tables ont été supprimées
SELECT 
  'Vérification' as check_type,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alerts')
      AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meetings')
      AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_settings')
    THEN '✅ Nettoyage réussi'
    ELSE '❌ Certaines tables existent encore'
  END as status;

-- Lister les tables restantes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('alerts', 'meetings', 'department_settings')
ORDER BY table_name;

-- =====================================================
-- APRÈS LE NETTOYAGE
-- =====================================================
-- Vous pouvez maintenant réexécuter les migrations depuis le début
-- 1. 20251201000000_create_alerts_table.sql
-- 2. 20251201000001_create_meetings_table.sql
-- 3. 20251201000002_create_department_settings.sql
-- etc.
