-- Fix document_status enum to include 'pending' value
-- This resolves the error: "invalid input value for enum document_status: 'pending'"

-- Add 'pending' to document_status enum if it doesn't exist
DO $$ 
BEGIN
  -- Check if 'pending' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'document_status'::regtype 
    AND enumlabel = 'pending'
  ) THEN
    -- Add 'pending' as the first value (before 'submitted')
    ALTER TYPE document_status ADD VALUE 'pending' BEFORE 'submitted';
  END IF;
END $$;

-- Update any existing documents that might have NULL status to 'submitted'
UPDATE documents 
SET status = 'submitted' 
WHERE status IS NULL;

-- Fix the RPC functions that incorrectly use 'pending' for documents
-- Replace with 'submitted' which is the correct initial status

-- Drop and recreate get_supervisor_stats function with correct status
DROP FUNCTION IF EXISTS get_supervisor_stats(UUID);

CREATE OR REPLACE FUNCTION get_supervisor_stats(p_supervisor_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_students INTEGER;
  v_active_students INTEGER;
  v_completed_students INTEGER;
  v_success_rate DECIMAL;
  v_avg_validation_days DECIMAL;
  v_pending_validations INTEGER;
  v_avg_grade DECIMAL;
BEGIN
  -- Nombre total d'étudiants assignés
  SELECT COUNT(DISTINCT student_id) INTO v_total_students
  FROM supervisor_assignments
  WHERE supervisor_id = p_supervisor_id;
  
  -- Étudiants actifs (avec sujet approuvé)
  SELECT COUNT(DISTINCT sa.student_id) INTO v_active_students
  FROM supervisor_assignments sa
  INNER JOIN thesis_topics tt ON tt.student_id = sa.student_id
  WHERE sa.supervisor_id = p_supervisor_id
    AND tt.status = 'approved';
  
  -- Étudiants ayant terminé (soutenance passée)
  SELECT COUNT(DISTINCT sa.student_id) INTO v_completed_students
  FROM supervisor_assignments sa
  INNER JOIN defense_sessions ds ON ds.student_id = sa.student_id
  WHERE sa.supervisor_id = p_supervisor_id
    AND ds.status = 'completed';
  
  -- Taux de réussite
  IF v_total_students > 0 THEN
    v_success_rate := (v_completed_students::DECIMAL / v_total_students) * 100;
  ELSE
    v_success_rate := 0;
  END IF;
  
  -- Temps moyen de validation des documents
  SELECT AVG(EXTRACT(days FROM (updated_at - submitted_at))) INTO v_avg_validation_days
  FROM documents
  WHERE supervisor_id = p_supervisor_id
    AND status IN ('approved', 'rejected');
  
  -- Validations en attente (documents soumis)
  SELECT COUNT(*) INTO v_pending_validations
  FROM documents
  WHERE supervisor_id = p_supervisor_id
    AND status = 'submitted';
  
  -- Note moyenne des étudiants
  SELECT AVG(final_grade) INTO v_avg_grade
  FROM final_grades fg
  INNER JOIN supervisor_assignments sa ON sa.student_id = fg.student_id
  WHERE sa.supervisor_id = p_supervisor_id;
  
  RETURN json_build_object(
    'total_students', v_total_students,
    'active_students', v_active_students,
    'completed_students', v_completed_students,
    'success_rate', ROUND(v_success_rate, 2),
    'avg_validation_days', ROUND(COALESCE(v_avg_validation_days, 0), 1),
    'pending_validations', v_pending_validations,
    'avg_student_grade', ROUND(COALESCE(v_avg_grade, 0), 2)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the alert trigger to use 'submitted' instead of 'pending'
DROP TRIGGER IF EXISTS document_status_alert_trigger ON documents;

CREATE OR REPLACE FUNCTION create_document_status_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Alerte pour l'encadreur quand un document est soumis
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    INSERT INTO alerts (
      user_id, alert_type, severity, title, message,
      related_entity_type, related_entity_id
    ) VALUES (
      NEW.supervisor_id,
      'document_submitted',
      'info',
      'Nouveau document soumis',
      'Un étudiant a soumis un nouveau document pour révision',
      'document',
      NEW.id
    );
  END IF;
  
  -- Alerte pour l'étudiant quand le document est validé/rejeté
  IF NEW.status IN ('approved', 'rejected') AND OLD.status != NEW.status THEN
    INSERT INTO alerts (
      user_id, alert_type, severity, title, message,
      related_entity_type, related_entity_id
    ) VALUES (
      NEW.student_id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'document_approved'
        ELSE 'document_rejected'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'info'
        ELSE 'warning'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Document approuvé'
        ELSE 'Document rejeté'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Votre document a été approuvé par votre encadreur'
        ELSE 'Votre document nécessite des révisions'
      END,
      'document',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_status_alert_trigger
  AFTER INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION create_document_status_alerts();

-- Verify the fix
SELECT 
  enumlabel as status_value,
  enumsortorder as sort_order
FROM pg_enum 
WHERE enumtypid = 'document_status'::regtype 
ORDER BY enumsortorder;