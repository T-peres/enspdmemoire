-- =====================================================
-- CORRECTION RAPIDE - ENCADREURS NON VISIBLES
-- =====================================================
-- Ce script corrige les problèmes courants qui empêchent
-- les encadreurs d'apparaître dans la liste

-- 1. Vérifier l'état actuel
SELECT 
  '=== ÉTAT ACTUEL ===' as section;

SELECT 
  p.email,
  CASE WHEN p.department_id IS NULL THEN '✗ Pas de département' ELSE '✓ Département: ' || d.code END as dept_status,
  CASE WHEN ur.role IS NULL THEN '✗ Pas de rôle' 
       WHEN ur.role = 'supervisor' THEN '✓ Rôle supervisor' 
       ELSE '⚠ Rôle: ' || ur.role END as role_status
FROM profiles p
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email LIKE '%encadreur%'
ORDER BY p.email;

-- 2. Correction automatique
DO $$
DECLARE
  v_git_dept_id UUID;
  v_profile RECORD;
  v_corrections INT := 0;
BEGIN
  -- Récupérer l'ID du département GIT
  SELECT id INTO v_git_dept_id FROM departments WHERE code = 'GIT';
  
  RAISE NOTICE '=== CORRECTIONS EN COURS ===';
  
  -- Parcourir tous les encadreurs
  FOR v_profile IN 
    SELECT p.id, p.email, p.department_id
    FROM profiles p
    WHERE p.email LIKE '%encadreur%'
  LOOP
    -- Correction 1: Assigner le département GIT si manquant
    IF v_profile.department_id IS NULL THEN
      UPDATE profiles
      SET department_id = v_git_dept_id
      WHERE id = v_profile.id;
      
      RAISE NOTICE '✓ Département GIT assigné à: %', v_profile.email;
      v_corrections := v_corrections + 1;
    END IF;
    
    -- Correction 2: Ajouter le rôle supervisor si manquant
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = v_profile.id AND role = 'supervisor'
    ) THEN
      INSERT INTO user_roles (user_id, role)
      VALUES (v_profile.id, 'supervisor')
      ON CONFLICT (user_id, role) DO NOTHING;
      
      RAISE NOTICE '✓ Rôle supervisor ajouté à: %', v_profile.email;
      v_corrections := v_corrections + 1;
    END IF;
  END LOOP;
  
  IF v_corrections = 0 THEN
    RAISE NOTICE '⚠ Aucune correction nécessaire - Les encadreurs sont déjà configurés';
  ELSE
    RAISE NOTICE '=== % correction(s) appliquée(s) ===', v_corrections;
  END IF;
END $$;

-- 3. Vérification après correction
SELECT 
  '' as spacer,
  '=== APRÈS CORRECTION ===' as section;

SELECT 
  p.email,
  p.first_name || ' ' || p.last_name as nom,
  d.code as departement,
  ur.role,
  '✓ Devrait être visible maintenant' as statut
FROM profiles p
JOIN departments d ON d.id = p.department_id
JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email LIKE '%encadreur%'
  AND ur.role = 'supervisor'
ORDER BY p.email;

-- 4. Test de la requête utilisée par l'interface
SELECT 
  '' as spacer,
  '=== TEST REQUÊTE INTERFACE ===' as section;

SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  d.code as dept
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
JOIN departments d ON d.id = p.department_id
WHERE ur.role = 'supervisor'
  AND d.code = 'GIT'
ORDER BY p.last_name;

-- 5. Instructions finales
SELECT 
  '' as spacer,
  '=== INSTRUCTIONS ===' as section;

SELECT 
  'Si les encadreurs apparaissent ci-dessus:' as etape,
  '1. Rafraîchir la page du dashboard (F5)' as action
UNION ALL
SELECT 
  '2. Vider le cache du navigateur (Ctrl+Shift+R)' as etape,
  '' as action
UNION ALL
SELECT 
  '3. Se déconnecter et se reconnecter' as etape,
  '' as action
UNION ALL
SELECT 
  '4. Les encadreurs devraient maintenant être visibles' as etape,
  '' as action;

-- =====================================================
-- RÉSULTAT ATTENDU
-- =====================================================
-- Après ce script, vous devriez voir:
-- ✓ encadreur1@enspd.cm - Dr. Pierre Bernard - GIT - supervisor
-- ✓ encadreur2@enspd.cm - Dr. Sophie Dubois - GIT - supervisor
--
-- Ensuite:
-- 1. Rafraîchir la page (F5)
-- 2. Aller dans "Attribution Encadreurs"
-- 3. Cliquer sur "Sélectionner un encadreur"
-- 4. Les 2 encadreurs devraient apparaître
-- =====================================================
