-- Script pour créer toutes les fonctions RPC manquantes
-- Ce script crée les fonctions utilisées dans l'application

-- =====================================================
-- ÉTAPE 0: Supprimer les anciennes versions des fonctions
-- =====================================================
DROP FUNCTION IF EXISTS public.select_topic_atomic(UUID, UUID);
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_department_stats(UUID);
DROP FUNCTION IF EXISTS public.get_supervisor_stats(UUID);
DROP FUNCTION IF EXISTS public.can_submit_final_report(UUID, UUID);
DROP FUNCTION IF EXISTS public.can_submit_report(UUID);
DROP FUNCTION IF EXISTS public.create_alert(UUID, TEXT, TEXT, TEXT, TEXT, UUID);

DO $$
BEGIN
  RAISE NOTICE '🗑️  Anciennes versions des fonctions supprimées';
END $$;

-- =====================================================
-- 1. FONCTION: select_topic_atomic
-- =====================================================
CREATE OR REPLACE FUNCTION public.select_topic_atomic(
  p_student_id UUID,
  p_topic_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic RECORD;
  v_selection_id UUID;
BEGIN
  -- Vérifier que l'utilisateur est bien l'étudiant
  IF auth.uid() != p_student_id THEN
    RETURN json_build_object('success', FALSE, 'error', 'Unauthorized');
  END IF;

  -- Vérifier si l'étudiant a déjà une sélection confirmée
  IF EXISTS (
    SELECT 1 FROM topic_selections
    WHERE student_id = p_student_id AND status = 'confirmed'
  ) THEN
    RETURN json_build_object('success', FALSE, 'error', 'You already have a confirmed topic');
  END IF;

  -- Verrouiller et récupérer le sujet
  SELECT * INTO v_topic FROM thesis_topics WHERE id = p_topic_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', 'Topic not found');
  END IF;

  IF v_topic.status != 'approved' THEN
    RETURN json_build_object('success', FALSE, 'error', 'Topic is not approved');
  END IF;

  IF v_topic.current_students >= v_topic.max_students THEN
    RETURN json_build_object('success', FALSE, 'error', 'Topic is full');
  END IF;

  -- Supprimer les anciennes sélections en attente
  DELETE FROM topic_selections WHERE student_id = p_student_id AND status = 'pending';

  -- Créer la nouvelle sélection
  INSERT INTO topic_selections (student_id, topic_id, status, selected_at)
  VALUES (p_student_id, p_topic_id, 'confirmed', NOW())
  RETURNING id INTO v_selection_id;

  -- Incrémenter le compteur
  UPDATE thesis_topics SET current_students = current_students + 1 WHERE id = p_topic_id;

  -- Attribution automatique si superviseur présent
  IF v_topic.supervisor_id IS NOT NULL THEN
    INSERT INTO supervisor_assignments (student_id, supervisor_id, assigned_by, assigned_at, is_active)
    VALUES (p_student_id, v_topic.supervisor_id, auth.uid(), NOW(), TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN json_build_object('success', TRUE, 'selection_id', v_selection_id);
END;
$$;

-- =====================================================
-- 2. FONCTION: create_notification
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link, read, created_at)
  VALUES (p_user_id, p_title, p_message, p_type, p_link, FALSE, NOW())
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- =====================================================
-- 3. FONCTION: get_department_stats
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_department_stats(p_department_id UUID)
RETURNS TABLE (
  total_students BIGINT,
  students_with_supervisor BIGINT,
  pending_themes BIGINT,
  approved_themes BIGINT,
  pending_meetings BIGINT,
  pending_defenses BIGINT,
  completed_defenses BIGINT,
  avg_progress NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles p
     INNER JOIN user_roles ur ON ur.user_id = p.id
     WHERE p.department_id = p_department_id AND ur.role = 'student') as total_students,
    
    (SELECT COUNT(DISTINCT sa.student_id) FROM supervisor_assignments sa
     INNER JOIN profiles p ON p.id = sa.student_id
     WHERE p.department_id = p_department_id AND sa.is_active = TRUE) as students_with_supervisor,
    
    (SELECT COUNT(*) FROM themes t WHERE t.department_id = p_department_id AND t.status = 'pending') as pending_themes,
    (SELECT COUNT(*) FROM themes t WHERE t.department_id = p_department_id AND t.status = 'approved') as approved_themes,
    
    0::BIGINT as pending_meetings,
    0::BIGINT as pending_defenses,
    0::BIGINT as completed_defenses,
    
    (SELECT COALESCE(AVG(fs.overall_progress), 0) FROM fiche_suivi fs
     INNER JOIN profiles p ON p.id = fs.student_id
     WHERE p.department_id = p_department_id) as avg_progress;
END;
$$;

-- =====================================================
-- 4. FONCTION: get_supervisor_stats
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_supervisor_stats(p_supervisor_id UUID)
RETURNS TABLE (
  total_students BIGINT,
  active_themes BIGINT,
  pending_documents BIGINT,
  pending_meetings BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM supervisor_assignments WHERE supervisor_id = p_supervisor_id AND is_active = TRUE) as total_students,
    (SELECT COUNT(*) FROM themes WHERE supervisor_id = p_supervisor_id AND status = 'approved') as active_themes,
    (SELECT COUNT(*) FROM documents d
     INNER JOIN themes t ON t.id = d.theme_id
     WHERE t.supervisor_id = p_supervisor_id AND d.status = 'submitted') as pending_documents,
    0::BIGINT as pending_meetings;
END;
$$;

-- =====================================================
-- 5. FONCTION: can_submit_final_report
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_submit_final_report(
  p_student_id UUID,
  p_theme_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_submit BOOLEAN := FALSE;
BEGIN
  -- Vérifier que tous les chapitres sont approuvés
  SELECT 
    COALESCE(
      (SELECT COUNT(*) FROM documents 
       WHERE theme_id = p_theme_id 
         AND student_id = p_student_id
         AND document_type IN ('chapter_1', 'chapter_2', 'chapter_3', 'chapter_4')
         AND status = 'approved'
      ) >= 4,
      FALSE
    )
  INTO v_can_submit;
  
  RETURN v_can_submit;
END;
$$;

-- =====================================================
-- 6. FONCTION: can_submit_report
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_submit_report(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Logique simple: toujours autoriser pour l'instant
  RETURN TRUE;
END;
$$;

-- =====================================================
-- 7. FONCTION: create_alert
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_alert(
  p_user_id UUID,
  p_alert_type TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'info',
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO alerts (
    user_id, alert_type, message, severity, 
    entity_type, entity_id, is_read, created_at
  )
  VALUES (
    p_user_id, p_alert_type, p_message, p_severity,
    p_entity_type, p_entity_id, FALSE, NOW()
  )
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.select_topic_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_department_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supervisor_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_submit_final_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_submit_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_alert TO authenticated;

-- Vérifier les fonctions créées
SELECT 
  p.proname as "Fonction",
  pg_get_function_arguments(p.oid) as "Paramètres"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'select_topic_atomic',
    'create_notification',
    'get_department_stats',
    'get_supervisor_stats',
    'can_submit_final_report',
    'can_submit_report',
    'create_alert'
  )
ORDER BY p.proname;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Toutes les fonctions RPC ont été créées';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Fonctions créées:';
  RAISE NOTICE '  1. select_topic_atomic - Sélection atomique de sujet';
  RAISE NOTICE '  2. create_notification - Création de notifications';
  RAISE NOTICE '  3. get_department_stats - Statistiques département';
  RAISE NOTICE '  4. get_supervisor_stats - Statistiques superviseur';
  RAISE NOTICE '  5. can_submit_final_report - Vérification soumission finale';
  RAISE NOTICE '  6. can_submit_report - Vérification soumission rapport';
  RAISE NOTICE '  7. create_alert - Création d''alertes';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Permissions accordées à authenticated';
  RAISE NOTICE '🔄 Rafraîchissez votre application (Ctrl+F5)';
END $$;
