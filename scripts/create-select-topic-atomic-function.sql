-- Créer la fonction RPC select_topic_atomic
-- Cette fonction permet à un étudiant de sélectionner un sujet de manière atomique

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
  v_result JSON;
BEGIN
  -- Vérifier que l'utilisateur est bien l'étudiant
  IF auth.uid() != p_student_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only select topics for yourself';
  END IF;

  -- Vérifier si l'étudiant a déjà une sélection confirmée
  IF EXISTS (
    SELECT 1 FROM topic_selections
    WHERE student_id = p_student_id
      AND status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'You already have a confirmed topic selection';
  END IF;

  -- Verrouiller la ligne du sujet pour éviter les conflits
  SELECT * INTO v_topic
  FROM thesis_topics
  WHERE id = p_topic_id
  FOR UPDATE;

  -- Vérifier que le sujet existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Topic not found';
  END IF;

  -- Vérifier que le sujet est approuvé
  IF v_topic.status != 'approved' THEN
    RAISE EXCEPTION 'Topic is not approved';
  END IF;

  -- Vérifier qu'il reste de la place
  IF v_topic.current_students >= v_topic.max_students THEN
    RAISE EXCEPTION 'Topic is full';
  END IF;

  -- Supprimer les anciennes sélections en attente de cet étudiant
  DELETE FROM topic_selections
  WHERE student_id = p_student_id
    AND status = 'pending';

  -- Créer la nouvelle sélection
  INSERT INTO topic_selections (
    student_id,
    topic_id,
    status,
    selected_at
  )
  VALUES (
    p_student_id,
    p_topic_id,
    'confirmed',
    NOW()
  )
  RETURNING id INTO v_selection_id;

  -- Incrémenter le compteur d'étudiants
  UPDATE thesis_topics
  SET current_students = current_students + 1
  WHERE id = p_topic_id;

  -- Créer une attribution automatique si le sujet a un superviseur
  IF v_topic.supervisor_id IS NOT NULL THEN
    INSERT INTO supervisor_assignments (
      student_id,
      supervisor_id,
      theme_id,
      assigned_by,
      assigned_at,
      is_active
    )
    VALUES (
      p_student_id,
      v_topic.supervisor_id,
      p_topic_id,
      auth.uid(),
      NOW(),
      TRUE
    )
    ON CONFLICT (student_id, supervisor_id) 
    WHERE is_active = TRUE
    DO NOTHING;
  END IF;

  -- Retourner le résultat
  SELECT json_build_object(
    'success', TRUE,
    'selection_id', v_selection_id,
    'topic_id', p_topic_id,
    'message', 'Topic selected successfully'
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner un JSON avec l'erreur
    RETURN json_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

-- Ajouter un commentaire sur la fonction
COMMENT ON FUNCTION public.select_topic_atomic IS 
'Permet à un étudiant de sélectionner un sujet de thèse de manière atomique. 
Vérifie la disponibilité, crée la sélection et incrémente le compteur.';

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.select_topic_atomic TO authenticated;

-- Vérifier que la fonction a été créée
SELECT 
  p.proname as "Fonction",
  pg_get_function_arguments(p.oid) as "Paramètres",
  pg_get_function_result(p.oid) as "Retour"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'select_topic_atomic';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Fonction select_topic_atomic créée avec succès';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Fonctionnalités:';
  RAISE NOTICE '  • Sélection atomique de sujet (évite les conflits)';
  RAISE NOTICE '  • Vérification de disponibilité';
  RAISE NOTICE '  • Incrémentation automatique du compteur';
  RAISE NOTICE '  • Attribution automatique au superviseur';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Permissions: Accordées à authenticated';
  RAISE NOTICE '🔄 Rafraîchissez votre application';
END $$;
