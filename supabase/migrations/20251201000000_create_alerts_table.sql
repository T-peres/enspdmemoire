-- =====================================================
-- Migration: Création de la table alerts
-- Description: Système d'alertes centralisées pour tous les utilisateurs
-- Date: 2025-12-01
-- =====================================================

-- Création de la table alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Type et sévérité de l'alerte
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'deadline_approaching',      -- Deadline qui approche
    'document_rejected',          -- Document rejeté
    'defense_scheduled',          -- Soutenance planifiée
    'validation_required',        -- Validation requise
    'student_inactive',           -- Étudiant inactif
    'plagiarism_failed',          -- Échec contrôle plagiat
    'meeting_scheduled',          -- Rencontre planifiée
    'grade_published',            -- Note publiée
    'comment_added',              -- Commentaire ajouté
    'assignment_changed'          -- Changement d'affectation
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  
  -- Contenu de l'alerte
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Entité liée (optionnel)
  related_entity_type TEXT CHECK (related_entity_type IN (
    'theme', 'document', 'defense', 'meeting', 'fiche_suivi', 'grade'
  )),
  related_entity_id UUID,
  
  -- État de l'alerte
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Optionnel: date d'expiration de l'alerte
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_dismissed ON alerts(dismissed) WHERE dismissed = FALSE;
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged) WHERE acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_expires_at ON alerts(expires_at) WHERE expires_at IS NOT NULL;

-- Commentaires pour documentation
COMMENT ON TABLE alerts IS 'Système d''alertes centralisées pour notifier les utilisateurs des événements importants';
COMMENT ON COLUMN alerts.alert_type IS 'Type d''alerte (deadline, rejet, validation, etc.)';
COMMENT ON COLUMN alerts.severity IS 'Niveau de sévérité: info, warning, error';
COMMENT ON COLUMN alerts.related_entity_type IS 'Type d''entité liée à l''alerte';
COMMENT ON COLUMN alerts.related_entity_id IS 'ID de l''entité liée';
COMMENT ON COLUMN alerts.acknowledged IS 'Alerte lue par l''utilisateur';
COMMENT ON COLUMN alerts.dismissed IS 'Alerte masquée par l''utilisateur';

-- Activer Row Level Security
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
DROP POLICY IF EXISTS "System can create alerts" ON alerts;

-- Politique: Les utilisateurs peuvent voir leurs propres alertes
CREATE POLICY "Users can view own alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Politique: Les utilisateurs peuvent mettre à jour leurs propres alertes (acknowledge/dismiss)
CREATE POLICY "Users can update own alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Politique: Seul le système peut créer des alertes (via triggers ou RPC)
CREATE POLICY "System can create alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fonction pour nettoyer les alertes expirées
CREATE OR REPLACE FUNCTION cleanup_expired_alerts()
RETURNS void AS $$
BEGIN
  DELETE FROM alerts
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW()
    AND dismissed = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancienne fonction si elle existe (avec n'importe quelle signature)
DROP FUNCTION IF EXISTS create_alert(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS create_alert(UUID, TEXT, TEXT, TEXT, TEXT);

-- Fonction helper pour créer une alerte
CREATE FUNCTION create_alert(
  p_user_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_message TEXT,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO alerts (
    user_id, alert_type, severity, title, message,
    related_entity_type, related_entity_id, expires_at
  ) VALUES (
    p_user_id, p_alert_type, p_severity, p_title, p_message,
    p_related_entity_type, p_related_entity_id, p_expires_at
  )
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Pour annuler cette migration, exécuter:
/*
DROP POLICY IF EXISTS "System can create alerts" ON alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
DROP FUNCTION IF EXISTS create_alert(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS cleanup_expired_alerts();
DROP TABLE IF EXISTS alerts CASCADE;
*/
