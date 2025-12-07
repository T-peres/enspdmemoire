-- Ajouter toutes les données de test pour le thème existant
-- ID du thème : 32edf1e8-d642-4e11-b081-4d8d519159aa

-- Variables
WITH vars AS (
  SELECT 
    '32edf1e8-d642-4e11-b081-4d8d519159aa'::uuid as theme_id,
    (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm') as student_id,
    (SELECT id FROM profiles WHERE email = 'encadreur1.git@enspd.cm') as supervisor_id
)

-- 1. FICHE DE SUIVI (avec les vraies colonnes)
INSERT INTO fiche_suivi (
  student_id,
  theme_id,
  supervisor_id,
  overall_progress,
  plan_submitted,
  plan_approved,
  chapter_1_progress,
  chapter_2_progress,
  chapter_3_progress,
  quality_rating,
  created_at
)
SELECT 
  student_id,
  theme_id,
  supervisor_id,
  45,
  TRUE,
  TRUE,
  60,
  40,
  20,
  4,
  NOW()
FROM vars
WHERE NOT EXISTS (
  SELECT 1 FROM fiche_suivi WHERE theme_id = (SELECT theme_id FROM vars)
);

SELECT '✅ Fiche de suivi créée' as info;

-- 2. RENCONTRES
INSERT INTO meetings (
  theme_id,
  student_id,
  supervisor_id,
  meeting_date,
  duration_minutes,
  meeting_type,
  status,
  objectives,
  next_steps,
  created_at
)
SELECT 
  theme_id,
  student_id,
  supervisor_id,
  NOW() - INTERVAL '21 days',
  90,
  'regular',
  'completed',
  'Définir le sujet et les objectifs',
  'Rédiger le plan détaillé',
  NOW() - INTERVAL '21 days'
FROM vars
UNION ALL
SELECT 
  theme_id,
  student_id,
  supervisor_id,
  NOW() - INTERVAL '14 days',
  60,
  'progress_review',
  'completed',
  'Revue du plan',
  'Commencer la rédaction',
  NOW() - INTERVAL '14 days'
FROM vars
UNION ALL
SELECT 
  theme_id,
  student_id,
  supervisor_id,
  NOW() - INTERVAL '7 days',
  75,
  'progress_review',
  'completed',
  'Revue de l''avancement',
  'Continuer la rédaction',
  NOW() - INTERVAL '7 days'
FROM vars
UNION ALL
SELECT 
  theme_id,
  student_id,
  supervisor_id,
  NOW() + INTERVAL '7 days',
  60,
  'regular',
  'scheduled',
  'Prochaine revue',
  NULL,
  NOW()
FROM vars;

SELECT '✅ 4 rencontres créées' as info;

-- 3. DOCUMENTS
INSERT INTO documents (
  student_id,
  theme_id,
  title,
  document_type,
  version_number,
  status,
  file_path,
  created_at
)
SELECT 
  student_id,
  theme_id,
  'Plan détaillé du mémoire',
  'outline',
  1,
  'approved',
  'documents/' || student_id || '/plan_v1.pdf',
  NOW() - INTERVAL '20 days'
FROM vars
UNION ALL
SELECT 
  student_id,
  theme_id,
  'Introduction',
  'chapter',
  1,
  'approved',
  'documents/' || student_id || '/intro_v1.pdf',
  NOW() - INTERVAL '10 days'
FROM vars
UNION ALL
SELECT 
  student_id,
  theme_id,
  'Chapitre 1 - État de l''art',
  'chapter',
  1,
  'pending',
  'documents/' || student_id || '/chap1_v1.pdf',
  NOW() - INTERVAL '3 days'
FROM vars
UNION ALL
SELECT 
  student_id,
  theme_id,
  'Chapitre 2 - Brouillon',
  'chapter',
  1,
  'draft',
  'documents/' || student_id || '/chap2_draft.pdf',
  NOW() - INTERVAL '1 day'
FROM vars;

SELECT '✅ 4 documents créés' as info;

-- 4. ALERTES
INSERT INTO alerts (
  user_id,
  type,
  title,
  message,
  priority,
  is_read,
  created_at
)
SELECT 
  student_id,
  'deadline',
  'Prochaine rencontre dans 7 jours',
  'Rencontre avec votre encadreur prévue',
  'medium',
  FALSE,
  NOW()
FROM vars
UNION ALL
SELECT 
  student_id,
  'document',
  'Document en attente',
  'Votre Chapitre 1 est en attente de validation',
  'medium',
  FALSE,
  NOW() - INTERVAL '3 days'
FROM vars
UNION ALL
SELECT 
  student_id,
  'progress',
  'Progression à 45%',
  'Vous avez atteint 45% de progression',
  'low',
  TRUE,
  NOW() - INTERVAL '1 day'
FROM vars
UNION ALL
SELECT 
  supervisor_id,
  'document',
  'Nouveau document à réviser',
  'L''étudiant a soumis le Chapitre 1',
  'high',
  FALSE,
  NOW() - INTERVAL '3 days'
FROM vars
UNION ALL
SELECT 
  supervisor_id,
  'meeting',
  'Rencontre planifiée',
  'Rencontre avec l''étudiant dans 7 jours',
  'medium',
  FALSE,
  NOW()
FROM vars;

SELECT '✅ 5 alertes créées' as info;

-- 5. MESSAGES
INSERT INTO messages (
  sender_id,
  recipient_id,
  content,
  is_read,
  created_at
)
SELECT 
  supervisor_id,
  student_id,
  'Bonjour, j''ai bien reçu votre chapitre 1. Je vais le lire cette semaine.',
  FALSE,
  NOW() - INTERVAL '3 days'
FROM vars
UNION ALL
SELECT 
  student_id,
  supervisor_id,
  'Merci beaucoup ! J''attends vos commentaires.',
  TRUE,
  NOW() - INTERVAL '3 days' + INTERVAL '2 hours'
FROM vars
UNION ALL
SELECT 
  supervisor_id,
  student_id,
  'Quelques remarques : l''état de l''art est bien documenté.',
  FALSE,
  NOW() - INTERVAL '1 day'
FROM vars
UNION ALL
SELECT 
  student_id,
  supervisor_id,
  'D''accord, je vais faire les corrections.',
  TRUE,
  NOW() - INTERVAL '1 day' + INTERVAL '3 hours'
FROM vars
UNION ALL
SELECT 
  student_id,
  supervisor_id,
  'J''ai commencé le chapitre 2. Pouvez-vous confirmer l''approche ?',
  TRUE,
  NOW() - INTERVAL '5 hours'
FROM vars;

SELECT '✅ 5 messages créés' as info;

-- RÉSUMÉ FINAL
SELECT 
  '═══════════════════════════════════════' as separateur
UNION ALL
SELECT '✅ DONNÉES DE TEST CRÉÉES AVEC SUCCÈS !'
UNION ALL
SELECT '═══════════════════════════════════════'
UNION ALL
SELECT ''
UNION ALL
SELECT '📊 Résumé :'
UNION ALL
SELECT '   • 1 thème (déjà créé)'
UNION ALL
SELECT '   • 1 fiche de suivi (45% progression)'
UNION ALL
SELECT '   • 4 rencontres'
UNION ALL
SELECT '   • 4 documents'
UNION ALL
SELECT '   • 5 alertes'
UNION ALL
SELECT '   • 5 messages'
UNION ALL
SELECT ''
UNION ALL
SELECT '🎯 Lancez l''application : npm run dev'
UNION ALL
SELECT '   Connectez-vous avec :'
UNION ALL
SELECT '   - etudiant2.git@enspd.cm'
UNION ALL
SELECT '   - encadreur1.git@enspd.cm'
UNION ALL
SELECT '═══════════════════════════════════════';

-- Vérification finale
SELECT 
  '📊 VÉRIFICATION FINALE' as titre,
  (SELECT COUNT(*) FROM thesis_topics WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')) as themes,
  (SELECT COUNT(*) FROM fiche_suivi WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')) as fiche_suivi,
  (SELECT COUNT(*) FROM meetings WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')) as meetings,
  (SELECT COUNT(*) FROM documents WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')) as documents,
  (SELECT COUNT(*) FROM alerts WHERE user_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')) as alerts_etudiant,
  (SELECT COUNT(*) FROM messages WHERE sender_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm') OR recipient_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')) as messages;
