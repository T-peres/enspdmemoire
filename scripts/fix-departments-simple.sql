-- =====================================================
-- SCRIPT SIMPLE : AJOUTER LES DÉPARTEMENTS
-- =====================================================
-- Exécutez ce script pour ajouter les départements et la colonne
-- =====================================================

-- 1. Créer la table departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insérer les 10 départements de l'ENSPD
INSERT INTO departments (code, name, description) VALUES
  ('GIT', 'Génie Informatique & Télécommunications', 'Formation en informatique, réseaux et télécommunications'),
  ('GESI', 'Génie Électrique et Systèmes Intelligents', 'Formation en électricité, électronique et systèmes intelligents'),
  ('GQHSE', 'Génie de la Qualité Hygiène Sécurité et Environnement', 'Formation en qualité, hygiène, sécurité et environnement'),
  ('GAM', 'Génie Automobile et Mécatronique', 'Formation en automobile et mécatronique'),
  ('GMP', 'Génie Maritime et Portuaire', 'Formation en ingénierie maritime et portuaire'),
  ('GP', 'Génie des Procédés', 'Formation en génie des procédés industriels'),
  ('GE', 'Génie Énergétique', 'Formation en énergies et systèmes énergétiques'),
  ('GM', 'Génie Mécanique', 'Formation en mécanique et conception'),
  ('GPH', 'Génie Physique', 'Formation en physique appliquée'),
  ('GC', 'Génie Civil', 'Formation en génie civil et construction')
ON CONFLICT (code) DO NOTHING;

-- 3. Ajouter la colonne department_id à profiles (si elle n'existe pas)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department_id UUID;

-- 4. Ajouter la contrainte de clé étrangère (si elle n'existe pas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_department_id_fkey'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_department_id_fkey 
    FOREIGN KEY (department_id) REFERENCES departments(id);
  END IF;
END $$;

-- 5. Créer l'index
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department_id);

-- 6. Vérification
SELECT 
  'Départements' as element,
  COUNT(*)::text as resultat
FROM departments

UNION ALL

SELECT 
  'Colonne department_id existe' as element,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name = 'department_id'
    ) THEN 'OUI ✅'
    ELSE 'NON ❌'
  END as resultat;

-- 7. Afficher les départements créés
SELECT 
  code as "Code",
  name as "Nom du Département"
FROM departments 
ORDER BY code;
