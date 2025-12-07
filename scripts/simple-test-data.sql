-- Script simplifié pour créer UN thème de test
-- Affiche les erreurs clairement

-- Étape 1 : Récupérer les IDs
WITH user_data AS (
  SELECT 
    (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm') as student_id,
    (SELECT id FROM profiles WHERE email = 'encadreur1.git@enspd.cm') as supervisor_id,
    (SELECT id FROM departments LIMIT 1) as department_id
)
SELECT 
  '👥 Utilisateurs trouvés' as info,
  student_id,
  supervisor_id,
  department_id
FROM user_data;

-- Étape 2 : Créer un thème simple
INSERT INTO thesis_topics (
  student_id,
  supervisor_id,
  department_id,
  title,
  description,
  status,
  created_at
)
SELECT 
  (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm'),
  (SELECT id FROM profiles WHERE email = 'encadreur1.git@enspd.cm'),
  (SELECT id FROM departments LIMIT 1),
  'Test - Système de gestion des mémoires',
  'Plateforme web pour la gestion des mémoires universitaires',
  'approved',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM thesis_topics 
  WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')
);

-- Vérifier si le thème a été créé
SELECT 
  '✅ Résultat' as info,
  COUNT(*) as themes_crees
FROM thesis_topics
WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm');

-- Afficher le thème créé
SELECT 
  '📝 Thème créé' as info,
  id,
  title,
  status,
  created_at
FROM thesis_topics
WHERE student_id = (SELECT id FROM profiles WHERE email = 'etudiant2.git@enspd.cm')
ORDER BY created_at DESC
LIMIT 1;
