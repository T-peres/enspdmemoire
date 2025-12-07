-- Script d'insertion de données de test pour les dashboards
-- Exécuter ce script pour avoir des données de test

-- Note: Ce script suppose que vous avez déjà des utilisateurs créés via l'authentification Supabase
-- Les IDs utilisés ici sont des exemples, vous devrez les adapter à vos vrais utilisateurs

-- =====================================================
-- IMPORTANT: Adapter les UUIDs selon vos utilisateurs
-- =====================================================

-- Exemple de structure:
-- Remplacez ces UUIDs par les vrais IDs de vos utilisateurs

DO $$
DECLARE
  v_student_id UUID;
  v_supervisor_id UUID;
  v_dept_head_id UUID;
  v_jury_id UUID;
  v_department_id UUID;
  v_theme_id UUID;
BEGIN
  -- Vérifier si des données existent déjà
  IF (SELECT COUNT(*) FROM profiles) = 0 THEN
    RAISE NOTICE '⚠️ Aucun profil trouvé. Créez d''abord des utilisateurs via l''authentification Supabase.';
    RETURN;
  END IF;

  -- Récupérer un département existant
  SELECT id INTO v_department_id FROM departments LIMIT 1;
  
  IF v_department_id IS NULL THEN
    RAISE NOTICE '⚠️ Aucun département trouvé. Créez d''abord des départements.';
    RETURN;
  END IF;

  -- Récupérer des utilisateurs existants (adapter selon vos rôles)
  SELECT user_id INTO v_student_id FROM user_roles WHERE role = 'student' LIMIT 1;
  SELECT user_id INTO v_supervisor_id FROM user_roles WHERE role = 'supervisor' LIMIT 1;
  SELECT user_id INTO v_dept_head_id FROM user_roles WHERE role = 'department_head' LIMIT 1;
  SELECT user_id INTO v_jury_id FROM user_roles WHERE role = 'jury' LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE NOTICE '⚠️ Aucun étudiant trouvé. Créez d''abord un utilisateur avec le rôle student.';
    RETURN;
  END IF;

  IF v_supervisor_id IS NULL THEN
    RAISE NOTICE '⚠️ Aucun encadreur trouvé. Créez d''abord un utilisateur avec le rôle supervisor.';
    RETURN;
  END IF;

  RAISE NOTICE '✓ Utilisateurs trouvés, insertion des données de test...';

  -- 1. Créer un thème si aucun n'existe
  IF NOT EXISTS (SELECT 1 FROM themes WHERE student_id = v_student_id) THEN
    INSERT INTO themes (
      student_id,
      supervisor_id,
      department_id,
      title,
      description,
      status,
      keywords
    ) VALUES (
      v_student_id,
      v_supervisor_id,
      v_department_id,
      'Système de gestion des mémoires universitaires',
      'Développement d''une plateforme web pour la gestion complète des mémoires de fin d''études',
      'approved',
      ARRAY['web', 'gestion', 'éducation']
    ) RETURNING id INTO v_theme_id;
    
    RAISE NOTICE '✓ Thème créé: %', v_theme_id;
  ELSE
    SELECT id INTO v_theme_id FROM themes WHERE student_id = v_student_id LIMIT 1;
    RAISE NOTICE '✓ Thème existant utilisé: %', v_theme_id;
  END IF;

  -- 2. Créer une attribution encadreur si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM supervisor_assignments WHERE student_id = v_student_id) THEN
    INSERT INTO supervisor_assignments (
      student_id,
      supervisor_id,
      theme_id,
      is_active,
      assigned_at
    ) VALUES (
      v_student_id,
      v_supervisor_id,
      v_theme_id,
      TRUE,
      NOW()
    );
    
    RAISE NOTICE '✓ Attribution encadreur créée';
  END IF;

  -- 3. Créer une fiche de suivi si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM fiche_suivi WHERE student_id = v_student_id) THEN
    INSERT INTO fiche_suivi (
      student_id,
      theme_id,
      supervisor_id,
      overall_progress,
      validation_status,
      last_meeting_date,
      next_meeting_date
    ) VALUES (
      v_student_id,
      v_theme_id,
      v_supervisor_id,
      45,
      'pending',
      NOW() - INTERVAL '7 days',
      NOW() + INTERVAL '7 days'
    );
    
    RAISE NOTICE '✓ Fiche de suivi créée';
  END IF;

  -- 4. Créer quelques rencontres
  IF NOT EXISTS (SELECT 1 FROM meetings WHERE student_id = v_student_id) THEN
    INSERT INTO meetings (
      theme_id,
      student_id,
      supervisor_id,
      meeting_date,
      duration_minutes,
      meeting_type,
      status,
      objectives,
      next_steps
    ) VALUES 
    (
      v_theme_id,
      v_student_id,
      v_supervisor_id,
      NOW() - INTERVAL '14 days',
      60,
      'regular',
      'completed',
      'Définir le plan du mémoire',
      'Rédiger l''introduction'
    ),
    (
      v_theme_id,
      v_student_id,
      v_supervisor_id,
      NOW() - INTERVAL '7 days',
      90,
      'progress_review',
      'completed',
      'Revue de l''avancement',
      'Continuer la rédaction du chapitre 2'
    );
    
    RAISE NOTICE '✓ Rencontres créées';
  END IF;

  -- 5. Créer quelques documents
  IF NOT EXISTS (SELECT 1 FROM documents WHERE student_id = v_student_id) THEN
    INSERT INTO documents (
      student_id,
      theme_id,
      title,
      document_type,
      version_number,
      status,
      file_path
    ) VALUES 
    (
      v_student_id,
      v_theme_id,
      'Plan du mémoire',
      'outline',
      1,
      'approved',
      'documents/plan_v1.pdf'
    ),
    (
      v_student_id,
      v_theme_id,
      'Introduction - Version 1',
      'chapter',
      1,
      'pending',
      'documents/intro_v1.pdf'
    );
    
    RAISE NOTICE '✓ Documents créés';
  END IF;

  -- 6. Créer quelques alertes
  IF NOT EXISTS (SELECT 1 FROM alerts WHERE user_id = v_student_id) THEN
    INSERT INTO alerts (
      user_id,
      type,
      title,
      message,
      priority,
      is_read
    ) VALUES 
    (
      v_student_id,
      'deadline',
      'Date limite approche',
      'La date limite de soumission du chapitre 2 est dans 7 jours',
      'high',
      FALSE
    ),
    (
      v_student_id,
      'document',
      'Document approuvé',
      'Votre plan de mémoire a été approuvé par votre encadreur',
      'medium',
      TRUE
    );
    
    RAISE NOTICE '✓ Alertes créées';
  END IF;

  -- 7. Créer quelques messages
  IF v_supervisor_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM messages WHERE sender_id = v_supervisor_id AND recipient_id = v_student_id) THEN
      INSERT INTO messages (
        sender_id,
        recipient_id,
        content,
        is_read
      ) VALUES 
      (
        v_supervisor_id,
        v_student_id,
        'Bonjour, j''ai relu votre introduction. Quelques corrections à apporter.',
        FALSE
      ),
      (
        v_student_id,
        v_supervisor_id,
        'Merci pour vos commentaires. Je vais faire les corrections.',
        TRUE
      );
      
      RAISE NOTICE '✓ Messages créés';
    END IF;
  END IF;

  RAISE NOTICE '✅ Données de test insérées avec succès!';
  RAISE NOTICE 'ℹ️ Vous pouvez maintenant tester les dashboards.';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur lors de l''insertion: %', SQLERRM;
    RAISE NOTICE 'ℹ️ Vérifiez que vous avez bien des utilisateurs créés avec les bons rôles.';
END $$;

-- Afficher un résumé des données
SELECT 
  'Data Summary' as summary,
  (SELECT COUNT(*) FROM profiles) as profiles,
  (SELECT COUNT(*) FROM themes) as themes,
  (SELECT COUNT(*) FROM documents) as documents,
  (SELECT COUNT(*) FROM meetings) as meetings,
  (SELECT COUNT(*) FROM fiche_suivi) as fiche_suivi,
  (SELECT COUNT(*) FROM alerts) as alerts,
  (SELECT COUNT(*) FROM messages) as messages,
  (SELECT COUNT(*) FROM supervisor_assignments) as assignments;
