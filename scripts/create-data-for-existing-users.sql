-- Créer des données de test pour les utilisateurs existants
-- Utilise les utilisateurs etudiant2.git@enspd.cm et encadreur1.git@enspd.cm

DO $$
DECLARE
  v_student_id UUID;
  v_supervisor_id UUID;
  v_department_id UUID;
  v_theme_id UUID;
  v_assignment_id UUID;
BEGIN
  RAISE NOTICE '🚀 Création de données pour les utilisateurs existants...';
  
  -- Récupérer l'étudiant
  SELECT id INTO v_student_id 
  FROM profiles 
  WHERE email = 'etudiant2.git@enspd.cm';
  
  IF v_student_id IS NULL THEN
    RAISE NOTICE '❌ Étudiant etudiant2.git@enspd.cm non trouvé';
    RETURN;
  END IF;
  
  RAISE NOTICE '✓ Étudiant trouvé: %', v_student_id;
  
  -- Récupérer l'encadreur
  SELECT id INTO v_supervisor_id 
  FROM profiles 
  WHERE email = 'encadreur1.git@enspd.cm';
  
  IF v_supervisor_id IS NULL THEN
    RAISE NOTICE '❌ Encadreur encadreur1.git@enspd.cm non trouvé';
    RETURN;
  END IF;
  
  RAISE NOTICE '✓ Encadreur trouvé: %', v_supervisor_id;
  
  -- Récupérer le département de l'étudiant
  SELECT department_id INTO v_department_id 
  FROM profiles 
  WHERE id = v_student_id;
  
  IF v_department_id IS NULL THEN
    -- Prendre le premier département disponible
    SELECT id INTO v_department_id FROM departments LIMIT 1;
  END IF;
  
  RAISE NOTICE '✓ Département: %', v_department_id;
  
  -- Récupérer l'attribution active
  SELECT id INTO v_assignment_id
  FROM supervisor_assignments
  WHERE student_id = v_student_id 
  AND supervisor_id = v_supervisor_id
  AND is_active = TRUE;
  
  RAISE NOTICE '✓ Attribution trouvée: %', v_assignment_id;
  
  -- 1. CRÉER UN THÈME (dans thesis_topics, pas themes qui est une vue)
  RAISE NOTICE '';
  RAISE NOTICE '📝 Création d''un thème...';
  
  INSERT INTO thesis_topics (
    student_id,
    supervisor_id,
    department_id,
    title,
    description,
    status,
    created_at,
    submitted_at
  ) VALUES (
    v_student_id,
    v_supervisor_id,
    v_department_id,
    'Système de gestion des mémoires de fin d''études',
    'Développement d''une plateforme web complète pour la gestion du cycle de vie des mémoires universitaires, incluant la soumission, le suivi par les encadreurs, l''évaluation par les jurys et l''archivage numérique.',
    'approved',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
  ) RETURNING id INTO v_theme_id;
  
  RAISE NOTICE '✅ Thème créé: %', v_theme_id;
  
  -- Mettre à jour l'attribution avec le theme_id
  UPDATE supervisor_assignments
  SET theme_id = v_theme_id
  WHERE id = v_assignment_id;
  
  RAISE NOTICE '✅ Attribution mise à jour avec le thème';
  
  -- 2. CRÉER UNE FICHE DE SUIVI
  RAISE NOTICE '';
  RAISE NOTICE '📝 Création d''une fiche de suivi...';
  
  INSERT INTO fiche_suivi (
    student_id,
    theme_id,
    supervisor_id,
    overall_progress,
    validation_status,
    last_meeting_date,
    next_meeting_date,
    chapter_progress,
    created_at,
    updated_at
  ) VALUES (
    v_student_id,
    v_theme_id,
    v_supervisor_id,
    45,
    'pending',
    NOW() - INTERVAL '7 days',
    NOW() + INTERVAL '7 days',
    jsonb_build_object(
      'introduction', 80,
      'chapter1', 60,
      'chapter2', 30,
      'chapter3', 10,
      'conclusion', 0
    ),
    NOW() - INTERVAL '30 days',
    NOW()
  );
  
  RAISE NOTICE '✅ Fiche de suivi créée (progression: 45%%)';
  
  -- 3. CRÉER DES RENCONTRES
  RAISE NOTICE '';
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
    student_engagement_rating,
    created_at
  ) VALUES 
  -- Rencontre 1 (il y a 3 semaines)
  (
    v_theme_id,
    v_student_id,
    v_supervisor_id,
    NOW() - INTERVAL '21 days',
    90,
    'regular',
    'completed',
    'Définir le sujet, les objectifs et la méthodologie du mémoire',
    'Discussion approfondie sur le contexte et les enjeux. Validation du sujet.',
    'Rédiger le plan détaillé et commencer l''introduction',
    4,
    5,
    NOW() - INTERVAL '21 days'
  ),
  -- Rencontre 2 (il y a 2 semaines)
  (
    v_theme_id,
    v_student_id,
    v_supervisor_id,
    NOW() - INTERVAL '14 days',
    60,
    'progress_review',
    'completed',
    'Revue du plan et de l''introduction',
    'Plan validé avec quelques ajustements. Introduction bien structurée.',
    'Finaliser l''introduction et démarrer le chapitre 1',
    4,
    4,
    NOW() - INTERVAL '14 days'
  ),
  -- Rencontre 3 (il y a 1 semaine)
  (
    v_theme_id,
    v_student_id,
    v_supervisor_id,
    NOW() - INTERVAL '7 days',
    75,
    'progress_review',
    'completed',
    'Revue de l''introduction et avancement du chapitre 1',
    'Introduction terminée. Chapitre 1 bien avancé, quelques corrections mineures.',
    'Terminer le chapitre 1 et commencer le chapitre 2',
    3,
    4,
    NOW() - INTERVAL '7 days'
  ),
  -- Rencontre 4 (dans 1 semaine - planifiée)
  (
    v_theme_id,
    v_student_id,
    v_supervisor_id,
    NOW() + INTERVAL '7 days',
    60,
    'progress_review',
    'scheduled',
    'Revue des chapitres 1 et 2',
    NULL,
    NULL,
    NULL,
    NULL,
    NOW()
  );
  
  RAISE NOTICE '✅ 4 rencontres créées (3 terminées, 1 planifiée)';
  
  -- 4. CRÉER DES DOCUMENTS
  RAISE NOTICE '';
  RAISE NOTICE '📝 Création de documents...';
  
  INSERT INTO documents (
    student_id,
    theme_id,
    title,
    document_type,
    version_number,
    status,
    file_path,
    comments,
    created_at
  ) VALUES 
  -- Plan détaillé (approuvé)
  (
    v_student_id,
    v_theme_id,
    'Plan détaillé du mémoire',
    'outline',
    1,
    'approved',
    'documents/' || v_student_id || '/plan_detaille_v1.pdf',
    'Plan bien structuré et cohérent. Approuvé.',
    NOW() - INTERVAL '20 days'
  ),
  -- Introduction (approuvée)
  (
    v_student_id,
    v_theme_id,
    'Introduction',
    'chapter',
    2,
    'approved',
    'documents/' || v_student_id || '/introduction_v2.pdf',
    'Excellente introduction. Problématique claire et bien posée.',
    NOW() - INTERVAL '10 days'
  ),
  -- Chapitre 1 (en attente)
  (
    v_student_id,
    v_theme_id,
    'Chapitre 1 - État de l''art',
    'chapter',
    1,
    'pending',
    'documents/' || v_student_id || '/chapitre1_v1.pdf',
    NULL,
    NOW() - INTERVAL '3 days'
  ),
  -- Chapitre 2 (brouillon)
  (
    v_student_id,
    v_theme_id,
    'Chapitre 2 - Méthodologie (brouillon)',
    'chapter',
    1,
    'draft',
    'documents/' || v_student_id || '/chapitre2_draft.pdf',
    NULL,
    NOW() - INTERVAL '1 day'
  );
  
  RAISE NOTICE '✅ 4 documents créés (2 approuvés, 1 en attente, 1 brouillon)';
  
  -- 5. CRÉER DES ALERTES
  RAISE NOTICE '';
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
  -- Alertes pour l'étudiant
  (
    v_student_id,
    'deadline',
    'Prochaine rencontre dans 7 jours',
    'N''oubliez pas votre rencontre avec votre encadreur le ' || TO_CHAR(NOW() + INTERVAL '7 days', 'DD/MM/YYYY à HH24:MI'),
    'medium',
    FALSE,
    NOW()
  ),
  (
    v_student_id,
    'document',
    'Document en attente de validation',
    'Votre Chapitre 1 est en attente de validation par votre encadreur',
    'medium',
    FALSE,
    NOW() - INTERVAL '3 days'
  ),
  (
    v_student_id,
    'progress',
    'Progression à 45%',
    'Vous avez atteint 45% de progression. Continuez sur cette lancée !',
    'low',
    TRUE,
    NOW() - INTERVAL '1 day'
  ),
  -- Alertes pour l'encadreur
  (
    v_supervisor_id,
    'document',
    'Nouveau document à réviser',
    'L''étudiant a soumis le Chapitre 1 - État de l''art',
    'high',
    FALSE,
    NOW() - INTERVAL '3 days'
  ),
  (
    v_supervisor_id,
    'meeting',
    'Rencontre planifiée dans 7 jours',
    'Rencontre avec l''étudiant prévue le ' || TO_CHAR(NOW() + INTERVAL '7 days', 'DD/MM/YYYY'),
    'medium',
    FALSE,
    NOW()
  );
  
  RAISE NOTICE '✅ 5 alertes créées (3 pour l''étudiant, 2 pour l''encadreur)';
  
  -- 6. CRÉER DES MESSAGES
  RAISE NOTICE '';
  RAISE NOTICE '📝 Création de messages...';
  
  INSERT INTO messages (
    sender_id,
    recipient_id,
    content,
    is_read,
    created_at
  ) VALUES 
  -- Conversation 1
  (
    v_supervisor_id,
    v_student_id,
    'Bonjour, j''ai bien reçu votre chapitre 1. Je vais le lire cette semaine et vous faire un retour détaillé.',
    FALSE,
    NOW() - INTERVAL '3 days'
  ),
  (
    v_student_id,
    v_supervisor_id,
    'Merci beaucoup ! J''attends vos commentaires avec impatience.',
    TRUE,
    NOW() - INTERVAL '3 days' + INTERVAL '2 hours'
  ),
  -- Conversation 2
  (
    v_supervisor_id,
    v_student_id,
    'Quelques remarques sur votre chapitre 1 : l''état de l''art est bien documenté, mais il faudrait ajouter une analyse critique des différentes approches. Nous en discuterons lors de notre prochaine rencontre.',
    FALSE,
    NOW() - INTERVAL '1 day'
  ),
  (
    v_student_id,
    v_supervisor_id,
    'D''accord, je vais travailler sur l''analyse critique. Merci pour vos retours !',
    TRUE,
    NOW() - INTERVAL '1 day' + INTERVAL '3 hours'
  ),
  -- Message récent
  (
    v_student_id,
    v_supervisor_id,
    'Bonjour, j''ai commencé le chapitre 2 sur la méthodologie. Pouvez-vous me confirmer que l''approche que nous avons discutée est la bonne ?',
    TRUE,
    NOW() - INTERVAL '5 hours'
  );
  
  RAISE NOTICE '✅ 5 messages créés (conversation étudiant-encadreur)';
  
  -- RÉSUMÉ FINAL
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ DONNÉES DE TEST CRÉÉES AVEC SUCCÈS !';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '👥 Utilisateurs :';
  RAISE NOTICE '   • Étudiant : etudiant2.git@enspd.cm';
  RAISE NOTICE '   • Encadreur : encadreur1.git@enspd.cm';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Données créées :';
  RAISE NOTICE '   • 1 thème (approuvé)';
  RAISE NOTICE '   • 1 fiche de suivi (45%% de progression)';
  RAISE NOTICE '   • 4 rencontres (3 terminées, 1 planifiée)';
  RAISE NOTICE '   • 4 documents (2 approuvés, 1 en attente, 1 brouillon)';
  RAISE NOTICE '   • 5 alertes (3 étudiant, 2 encadreur)';
  RAISE NOTICE '   • 5 messages (conversation active)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Prochaines étapes :';
  RAISE NOTICE '   1. Lancer l''application : npm run dev';
  RAISE NOTICE '   2. Se connecter avec :';
  RAISE NOTICE '      - etudiant2.git@enspd.cm (voir dashboard étudiant)';
  RAISE NOTICE '      - encadreur1.git@enspd.cm (voir dashboard encadreur)';
  RAISE NOTICE '   3. Les dashboards afficheront toutes les données !';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERREUR : %', SQLERRM;
    RAISE NOTICE '';
END $$;

-- Afficher le résumé final
SELECT 
  '📊 RÉSUMÉ FINAL' as titre,
  (SELECT COUNT(*) FROM profiles) as profiles,
  (SELECT COUNT(*) FROM themes) as themes,
  (SELECT COUNT(*) FROM documents) as documents,
  (SELECT COUNT(*) FROM meetings) as meetings,
  (SELECT COUNT(*) FROM fiche_suivi) as fiche_suivi,
  (SELECT COUNT(*) FROM alerts) as alerts,
  (SELECT COUNT(*) FROM messages) as messages,
  (SELECT COUNT(*) FROM supervisor_assignments WHERE is_active = TRUE) as assignments_actives;
