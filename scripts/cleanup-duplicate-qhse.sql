-- Nettoyer le doublon GQHSE/QHSEI
-- On garde QHSEI qui est le code officiel

-- 1. Vérifier d'abord s'il y a des données liées à GQHSE
SELECT 
  'profiles' as table_name,
  COUNT(*) as count
FROM profiles 
WHERE department_id = (SELECT id FROM departments WHERE code = 'GQHSE')
UNION ALL
SELECT 
  'thesis_topics' as table_name,
  COUNT(*) as count
FROM thesis_topics 
WHERE department_id = (SELECT id FROM departments WHERE code = 'GQHSE');

-- 2. Migrer tous les profiles de GQHSE vers QHSEI
UPDATE profiles 
SET department_id = (SELECT id FROM departments WHERE code = 'QHSEI')
WHERE department_id = (SELECT id FROM departments WHERE code = 'GQHSE');

-- 3. Migrer tous les thesis_topics de GQHSE vers QHSEI
UPDATE thesis_topics 
SET department_id = (SELECT id FROM departments WHERE code = 'QHSEI')
WHERE department_id = (SELECT id FROM departments WHERE code = 'GQHSE');

-- 4. Migrer tous les defense_sessions de GQHSE vers QHSEI (si la colonne existe)
UPDATE defense_sessions 
SET department_id = (SELECT id FROM departments WHERE code = 'QHSEI')
WHERE department_id = (SELECT id FROM departments WHERE code = 'GQHSE');

-- 5. Maintenant on peut supprimer GQHSE
DELETE FROM departments WHERE code = 'GQHSE';

-- 6. Vérification finale
SELECT code, name FROM departments ORDER BY code;
