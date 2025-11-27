-- =====================================================
-- SCRIPT DE TEST - Interface Encadreur
-- =====================================================

-- 1. Vérifier que les nouvelles tables existent
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'supervisor_meetings',
    'intermediate_evaluations',
    'document_comments',
    'messages',
    'alerts'
  )
ORDER BY table_name;

-- 2. Vérifier les index
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'supervisor_meetings',
    'intermediate_evaluations',
    'document_comments',
    'messages',
    'alerts'
  )
ORDER BY tablename, indexname;

-- 3. Vérifier les politiques RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'supervisor_meetings',
    'intermediate_evaluations',
    'document_comments',
    'messages',
    'alerts'
  )
ORDER BY tablename, policyname;

-- 4. Vérifier que la vue existe
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'supervisor_students_overview';

-- 5. Vérifier que les fonctions existent
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_supervisor_stats',
    'create_alert'
  )
ORDER BY routine_name;

-- 6. Test de la fonction get_supervisor_stats
-- Remplacer 'SUPERVISOR_UUID' par un UUID d'encadreur réel
-- SELECT * FROM get_supervisor_stats('SUPERVISOR_UUID');

-- 7. Test de création d'une alerte
-- Remplacer 'USER_UUID' par un UUID d'utilisateur réel
/*
SELECT create_alert(
  'USER_UUID'::uuid,
  'missing_meeting',
  'warning',
  'Rencontre manquante',
  'Aucune rencontre enregistrée depuis 30 jours',
  'student',
  NULL
);
*/

-- 8. Vérifier les triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN (
    'supervisor_meetings',
    'intermediate_evaluations',
    'document_comments'
  )
ORDER BY event_object_table, trigger_name;

-- 9. Compter les enregistrements dans chaque table
SELECT 'supervisor_meetings' as table_name, COUNT(*) as count FROM supervisor_meetings
UNION ALL
SELECT 'intermediate_evaluations', COUNT(*) FROM intermediate_evaluations
UNION ALL
SELECT 'document_comments', COUNT(*) FROM document_comments
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'alerts', COUNT(*) FROM alerts;

-- 10. Vérifier la structure de la vue supervisor_students_overview
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'supervisor_students_overview'
ORDER BY ordinal_position;

-- =====================================================
-- TESTS D'INSERTION (Optionnel - Décommenter pour tester)
-- =====================================================

/*
-- Test 1: Créer une rencontre (remplacer les UUIDs)
INSERT INTO supervisor_meetings (
  theme_id,
  student_id,
  supervisor_id,
  meeting_date,
  duration_minutes,
  objectives,
  recommendations,
  status
) VALUES (
  'THEME_UUID'::uuid,
  'STUDENT_UUID'::uuid,
  'SUPERVISOR_UUID'::uuid,
  NOW(),
  60,
  'Discuter du plan de mémoire',
  'Revoir la méthodologie',
  'draft'
);

-- Test 2: Créer une évaluation intermédiaire
INSERT INTO intermediate_evaluations (
  theme_id,
  student_id,
  supervisor_id,
  evaluation_type,
  content_quality,
  methodology_quality,
  writing_quality,
  research_depth,
  autonomy_level,
  respect_deadlines,
  overall_score,
  strengths,
  weaknesses,
  recommendations
) VALUES (
  'THEME_UUID'::uuid,
  'STUDENT_UUID'::uuid,
  'SUPERVISOR_UUID'::uuid,
  'monthly',
  4,
  3,
  4,
  3,
  4,
  5,
  13.33,
  'Bon travail de recherche',
  'Méthodologie à améliorer',
  'Continuer sur cette voie'
);

-- Test 3: Créer un commentaire sur un document
INSERT INTO document_comments (
  document_id,
  author_id,
  comment_text,
  comment_type,
  priority
) VALUES (
  'DOCUMENT_UUID'::uuid,
  'SUPERVISOR_UUID'::uuid,
  'Excellent travail sur cette section',
  'general',
  'normal'
);

-- Test 4: Envoyer un message
INSERT INTO messages (
  sender_id,
  recipient_id,
  subject,
  body
) VALUES (
  'SUPERVISOR_UUID'::uuid,
  'STUDENT_UUID'::uuid,
  'Rendez-vous de suivi',
  'Bonjour, je souhaite planifier un rendez-vous pour discuter de votre avancement.'
);
*/

-- =====================================================
-- REQUÊTES DE DIAGNOSTIC
-- =====================================================

-- Vérifier les contraintes de clés étrangères
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'supervisor_meetings',
    'intermediate_evaluations',
    'document_comments',
    'messages',
    'alerts'
  )
ORDER BY tc.table_name, kcu.column_name;

-- Vérifier les contraintes CHECK
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
  AND tc.table_name IN (
    'supervisor_meetings',
    'intermediate_evaluations',
    'document_comments',
    'messages',
    'alerts'
  )
ORDER BY tc.table_name, tc.constraint_name;

