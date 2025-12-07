-- Script simplifié pour créer des données de test
-- Fonctionne même sans données existantes

DO $$
DECLARE
  v_student_id UUID;
  v_supervisor_id UUID;
  v_dept_head_id UUID;
  v_department_id UUID;
  v_theme_id UUID;
  v_student_count INTEGER;
  v_supervisor_count INTEGER;
BEGIN
  RAISE NOTICE '🚀 Début de la création des données de test...';
  
  -- Vérifier les utilisateurs disponibles
  SELECT COUNT(*) INTO v_student_count FROM user_roles WHERE role = 'student';
  SELECT COUNT(*) INTO v_supervisor_count FROM user_roles WHERE role = 'supervisor';
  
  RAISE NOTICE 'ℹ️ Étudiants trouvés: %', v_student_count;
  RAISE NOTICE 'ℹ️ Encadreurs trouvés: %', v_supervisor_count;
  
  -- Récupérer un département
  SELECT id INTO v_department_id FROM departments LIMIT 1;
  
  IF v_department_id IS NULL THEN
    RAISE NOTICE '❌ Aucun département trouvé. Impossible de continuer.';
    RETURN;
  END IF;
  
  RAISE NOTICE '✓ Département trouvé: %', v_department_id;
  
  -- Récupérer un étudiant
  SELECT user_id INTO v_student_id 
  FROM user_roles 
  WHERE role = 'student' 
  LIMIT 1;
  
  IF v_student_id IS NULL THEN
    RAISE NOTICE '❌ Aucun étudiant trouvé.';
    RAISE NOTICE 'ℹ️ Créez un utilisateur avec le rôle "student" d''abord.';
    RETURN;
  END IF;
  
  RAISE NOTICE '✓ Étudiant trouvé: %', v_student_id;
  
  -- Récupérer un encadreur
  SELECT user_id INTO v_supervisor_id 
  FROM user_roles 
  WHERE role = 'supervisor' 
  LIMIT 1;
  
  IF v_supervisor_id IS NULL THEN
    RAISE NOTICE '❌ Aucun encadreur trouvé.';
    RAISE NOTICE 'ℹ️ Créez un utilisateur avec le rôle "supervisor" d''abord.';
    RETURN;
  END IF;
  
  RAISE NOTICE '✓ Encadreur trouvé: %', v_supervisor_id;
  
  -- 1. CRÉER UN THÈME
  RAISE NOTICE '📝 Création d''un thème...';
  
  INSERT INTO themes (
    student_id,
    supervisor_id,
    department_id,
    title,
    description,
    status,
    keywords,
    created_at
  ) VALUES (
    v_student_id,
    v_supervisor_id,
    v_department_id,
    'Développement d''une plateforme de gestion des mémoires',
    'Conception et développement d''une application web pour la gestion complète du cycle de vie des mémoires de fin d''études, incluant la soumission, le suivi, l''évaluation et l''archivage.',
    'approved',
    ARRAY['web', 'gestion', 'éducation', 'suivi académique'],
    NOW()
  ) RETURNING id INTO v_theme_id;
  
  RAISE NOTICE '✅ Thème créé: %', v_theme_id;
  
  -- 2. CRÉER UNE ATTRIBUTION (si elle n'existe pas déjà)
  IF NOT EXISTS (
    SELECT 1 FROM supervisor_assignments 
    WHERE student_id = v_student_id 
    AND supervisor_id = v_supervisor_id
  ) THEN
    RAISE NOTICE '📝 Création d''une attribution...';
    
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
    
    RAISE NOTICE '✅ Attribution créée';
  ELSE
    RAISE NOTICE '✓ Attribution existe déjà';
  END IF;
  
  -- 3. CRÉER UNE FICHE DE SUIVI
  RAISE NOTICE '📝 Création d''une fiche de suivi...';
  
  INSERT INTO fiche_suivi (
    student_id,
    theme_id,
    supervisor_id,
    overall_progress,
    validation_status,
    last_meeting_date,
    next_meeting_date,
    created_at
  ) VALUES (
    v_student_id,
    v_theme_id,
    v_supervisor_id,
    35,
    'pending',
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '5 days',
    NOW()
  );
  
  RAISE NOTICE '✅ Fiche de suivi créée';
  
  -- 4. CRÉER DES RENCONTRES
  RAISE NOTICE '📝 Création de rencontres...';
  
  INSERT INTO meetings (
    theme_id,
    student_id,
    supervisor_id,
    meeting_date,
    duration_minutes,
    meeting_type,
    status,
    objectives,
    work_done,
    next_steps,
    progress_rating,
    created_at
  ) VALUES 
  (
    v_theme_id,
    v_student_id,
    v_supervisor_id,
    NOW() - INTERVAL '20 days',
    60,
    'regular',
    'completed',
    'Définir le sujet et les objectifs du mémoire',
    'Discussion sur les différentes approches possibles',
    'Rédiger le plan détaillé',
    4,
    NOW() - INTERVAL '20 days'
  ),
  (
    v_theme_id,
    v_student_id,
    v_supervisor_id,
    NOW() - INTERVAL '10 days',
    90,
    'progress_review',
    'completed',
    'Revue du plan et de l''introduction',
    'Plan validé, introduction en cours',
    'Terminer l''introduction et commencer le chapitre 1',
    3,
    NOW() - INTERVAL '10 days'
  ),
  (
    v_theme_id,
    v_student_id,
    v_supervisor_id,
    NOW() + INTERVAL '5 days',
    60,
    'regular',
    'scheduled',
    'Revue du chapitre 1',
    NULL,
    NULL,
    NULL,
    NOW()
  );
  
  RAISE NOTICE '✅ 3 rencontres créées';
  
  -- 5. CRÉER DES DOCUMENTS
  RAISE NOTICE '📝 Création de documents...';
  
  INSERT INTO documents (
    student_id,
    theme_id,
    title,
    document_type,
    version_number,
    status,
    file_path,
    created_at
  ) VALUES 
  (
    v_student_id,
    v_theme_id,
    'Plan détaillé du mémoire',
    'outline',
    1,
    'approved',
    'documents/' || v_student_id || '/plan_v1.pdf',
    NOW() - INTERVAL '15 days'
  ),
  (
    v_student_id,
    v_theme_id,
    'Introduction - Version 1',
    'chapter',
    1,
    'pending',
    'documents/' || v_student_id || '/intro_v1.pdf',
    NOW() - INTERVAL '5 days'
  ),
  (
    v_student_id,
    v_theme_id,
    'Chapitre 1 - Brouillon',
    'chapter',
    1,
    'draft',
    'documents/' || v_student_id || '/chap1_draft.pdf',
    NOW() - INTERVAL '2 days'
  );
  
  RAISE NOTICE '✅ 3 documents créés';
  
  -- 6. CRÉER DES ALERTES
  RAISE NOTICE '📝 Création d''alertes...';
  
  INSERT INTO alerts (
    user_id,
    type,
    title,
    message,
    priority,
    is_read,
    created_at
  ) VALUES 
  (
    v_student_id,
    'deadline',
    'Prochaine rencontre dans 5 jours',
    'N''oubliez pas votre rencontre avec votre encadreur le ' || TO_CHAR(NOW() + INTERVAL '5 days', 'DD/MM/YYYY'),
    'medium',
    FALSE,
    NOW()
  ),
  (
    v_student_id,
    'document',
    'Document en attente de validation',
    'Votre introduction est en attente de validation par votre encadreur',
    'medium',
    FALSE,
    NOW() - INTERVAL '1 day'
  ),
  (
    v_supervisor_id,
    'document',
    'Nouveau document à réviser',
    'L''étudiant a soumis un nouveau document : Introduction - Version 1',
    'high',
    FALSE,
    NOW() - INTERVAL '5 days'
  );
  
  RAISE NOTICE '✅ 3 alertes créées';
  
  -- 7. CRÉER DES MESSAGES
  RAISE NOTICE '📝 Création de messages...';
  
  INSERT INTO messages (
    sender_id,
    recipient_id,
    content,
    is_read,
    created_at
  ) VALUES 
  (
    v_supervisor_id,
    v_student_id,
    'Bonjour, j''ai bien reçu votre introduction. Je vais la lire cette semaine et vous faire un retour.',
    FALSE,
    NOW() - INTERVAL '5 days'
  ),
  (
    v_student_id,
    v_supervisor_id,
    'Merci beaucoup ! J''attends vos commentaires.',
    TRUE,
    NOW() - INTERVAL '4 days'
  ),
  (
    v_supervisor_id,
    v_student_id,
    'Quelques remarques sur votre introduction : la problématique pourrait être plus précise. Voyons cela lors de notre prochaine rencontre.',
    FALSE,
    NOW() - INTERVAL '2 days'
  );
  
  RAISE NOTICE '✅ 3 messages créés';
  
  -- RÉSUMÉ FINAL
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ DONNÉES DE TEST CRÉÉES AVEC SUCCÈS !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Résumé des données créées :';
  RAISE NOTICE '   • 1 thème';
  RAISE NOTICE '   • 1 attribution encadreur';
  RAISE NOTICE '   • 1 fiche de suivi (progression: 35%%)';
  RAISE NOTICE '   • 3 rencontres (2 terminées, 1 planifiée)';
  RAISE NOTICE '   • 3 documents (1 approuvé, 1 en attente, 1 brouillon)';
  RAISE NOTICE '   • 3 alertes (2 pour l''étudiant, 1 pour l''encadreur)';
  RAISE NOTICE '   • 3 messages (conversation étudiant-encadreur)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Vous pouvez maintenant :';
  RAISE NOTICE '   1. Lancer l''application : npm run dev';
  RAISE NOTICE '   2. Se connecter avec l''étudiant ou l''encadreur';
  RAISE NOTICE '   3. Voir les dashboards avec des données réelles !';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERREUR lors de la création des données';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE 'Erreur: %', SQLERRM;
    RAISE NOTICE '';
    RAISE NOTICE '💡 Vérifiez que :';
    RAISE NOTICE '   • Vous avez des utilisateurs avec les rôles student et supervisor';
    RAISE NOTICE '   • Les migrations sont bien appliquées';
    RAISE NOTICE '   • Les tables existent';
END $$;

-- Afficher le résumé des données
SELECT 
  '📊 RÉSUMÉ DES DONNÉES' as titre,
  (SELECT COUNT(*) FROM profiles) as profiles,
  (SELECT COUNT(*) FROM themes) as themes,
  (SELECT COUNT(*) FROM documents) as documents,
  (SELECT COUNT(*) FROM meetings) as meetings,
  (SELECT COUNT(*) FROM fiche_suivi) as fiche_suivi,
  (SELECT COUNT(*) FROM alerts) as alerts,
  (SELECT COUNT(*) FROM messages) as messages,
  (SELECT COUNT(*) FROM supervisor_assignments) as assignments;
