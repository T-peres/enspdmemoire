-- =====================================================
-- Migration: Ajout des départements de l'ENSPD
-- Date: 2025-12-02
-- Description: Insertion des 10 départements officiels de
--              l'École Nationale Supérieure Polytechnique de Douala
-- =====================================================

-- Insertion des départements avec gestion des doublons
INSERT INTO departments (name, code, description) VALUES
  (
    'Génie Informatique & Télécommunications',
    'GIT',
    'Formation en informatique, réseaux, télécommunications et systèmes d''information'
  ),
  (
    'Génie Électrique et Systèmes Intelligents',
    'GESI',
    'Formation en électricité, électronique, automatique et systèmes intelligents'
  ),
  (
    'Génie Civil',
    'GC',
    'Formation en construction, structures, géotechnique et infrastructures'
  ),
  (
    'Génie Mécanique',
    'GM',
    'Formation en conception mécanique, fabrication et maintenance industrielle'
  ),
  (
    'Génie des Procédés',
    'GP',
    'Formation en procédés industriels, chimie et transformation de la matière'
  ),
  (
    'Génie Énergétique',
    'GE',
    'Formation en production, distribution et gestion de l''énergie'
  ),
  (
    'Génie Automobile et Mécatronique',
    'GAM',
    'Formation en systèmes automobiles, mécatronique et véhicules intelligents'
  ),
  (
    'Génie Maritime et Portuaire',
    'GMP',
    'Formation en ingénierie maritime, portuaire et transport maritime'
  ),
  (
    'Génie de la Qualité, Hygiène, Sécurité et Environnement Industriel',
    'QHSEI',
    'Formation en management de la qualité, HSE et développement durable'
  ),
  (
    'Génie Physique',
    'GPH',
    'Formation en physique appliquée, instrumentation et technologies biomédicales'
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Vérification et affichage des départements insérés
DO $$
DECLARE
  dept_count INTEGER;
  dept_record RECORD;
BEGIN
  SELECT COUNT(*) INTO dept_count FROM departments;
  RAISE NOTICE 'Nombre total de départements dans la base: %', dept_count;
  
  RAISE NOTICE 'Liste des départements ENSPD:';
  FOR dept_record IN 
    SELECT code, name FROM departments ORDER BY code
  LOOP
    RAISE NOTICE '  - [%] %', dept_record.code, dept_record.name;
  END LOOP;
END $$;

-- Commentaire sur la table
COMMENT ON TABLE departments IS 'Départements de l''ENSPD - Structure organisationnelle des filières de formation';

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
