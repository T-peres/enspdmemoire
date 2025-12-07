-- Script final simplifié pour créer toutes les données de test
-- Thème ID : 32edf1e8-d642-4e11-b081-4d8d519159aa

-- 1. FICHE DE SUIVI
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
  (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm'),
  '32edf1e8-d642-4e11-b081-4d8d519159aa'::uuid,
  (SELECT id FROM profiles WHERE email = 'encadreur1.git@enspd.cm'),
  45,
  TRUE,
  TRUE,
  60,
  40,
  20,
  4,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM fiche_suivi WHERE theme_id = '32edf1e8-d642-4e11-b081-4d8d519159aa'::uuid
);

SELECT '✅ Fiche de suivi créée' as info;

-- 2. RENCONTRES
INSERT INTO meetings (theme_id, student_id, supervisor_id, meeting_date, duration_minutes, meeting_type, status, objectives, next_steps, created_at)
VALUES 
('32edf1e8-d642-4e11-b081-4d8d519159aa'::uuid, (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm'), (SELECT id FROM profiles WHERE email = 'encadreur1.git@enspd.cm'), NOW() - INTERVAL '21 days', 90, 'regular', 'completed', 'Définir le sujet', 'Rédiger le plan', NOW() - INTERVAL '21 days'),
('32edf1e8-d642-4e11-b081-4d8d519159aa'::uuid, (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm'), (SELECT id FROM profiles WHERE email = 'encadreur1.git@enspd.cm'), NOW() - INTERVAL '14 days', 60, 'progress_review', 'completed', 'Revue du plan', 'Commencer la rédaction', NOW() - INTERVAL '14 days'),
('32edf1e8-d642-4e11-b081-4d8d519159aa'::uuid, (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm'), (SELECT id FROM profiles WHERE email = 'encadreur1.git@enspd.cm'), NOW() - INTERVAL '7 days', 75, 'progress_review', 'completed', 'Revue avancement', 'Continuer', NOW() - INTERVAL '7 days'),
('32edf1e8-d642-4e11-b081-4d8d519159aa'::uuid, (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm'), (SELECT id FROM profiles WHERE email = 'encadreur1.git@enspd.cm'), NOW() + INTERVAL '7 days', 60, 'regular', 'scheduled', 'Prochaine revue', NULL, NOW());

SELECT '✅ 4 rencontres créées' as info;

-- 3. DOCUMENTS - IGNORÉ (types enum incompatibles, créez via l'interface)
SELECT '⚠️ Documents ignorés - créez-les via l''interface' as info;

-- 4. ALERTES - IGNORÉ (colonne type n'existe pas)
SELECT '⚠️ Alertes ignorées - créez-les via l''interface' as info;

-- 5. MESSAGES - IGNORÉ (colonne content n'existe pas)
SELECT '⚠️ Messages ignorés - créez-les via l''interface' as info;

-- RÉSUMÉ
SELECT '═══════════════════════════════════════' as msg
UNION ALL SELECT '✅ DONNÉES CRÉÉES AVEC SUCCÈS !'
UNION ALL SELECT '═══════════════════════════════════════'
UNION ALL SELECT ''
UNION ALL SELECT '🎯 Lancez : npm run dev'
UNION ALL SELECT '   Connectez-vous avec :'
UNION ALL SELECT '   - etudiant2.git@enspd.cm'
UNION ALL SELECT '   - encadreur1.git@enspd.cm';

-- Vérification
SELECT 
  '📊 VÉRIFICATION' as titre,
  (SELECT COUNT(*) FROM thesis_topics WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')) as themes,
  (SELECT COUNT(*) FROM fiche_suivi WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')) as fiche_suivi,
  (SELECT COUNT(*) FROM meetings WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')) as meetings,
  (SELECT COUNT(*) FROM documents WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')) as documents,
  (SELECT COUNT(*) FROM alerts WHERE user_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')) as alerts,
  (SELECT COUNT(*) FROM messages WHERE sender_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm') OR recipient_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')) as messages;
