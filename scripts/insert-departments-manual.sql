-- Script manuel pour insérer les départements ENSPD
-- À utiliser si la migration automatique échoue

DELETE FROM departments WHERE code IN ('GIT', 'GESI', 'GC', 'GM', 'GP', 'GE', 'GAM', 'GMP', 'QHSEI', 'GPH');

INSERT INTO departments (name, code, description) VALUES
  ('Génie Informatique & Télécommunications', 'GIT', 'Formation en informatique, réseaux, télécommunications et systèmes d''information'),
  ('Génie Électrique et Systèmes Intelligents', 'GESI', 'Formation en électricité, électronique, automatique et systèmes intelligents'),
  ('Génie Civil', 'GC', 'Formation en construction, structures, géotechnique et infrastructures'),
  ('Génie Mécanique', 'GM', 'Formation en conception mécanique, fabrication et maintenance industrielle'),
  ('Génie des Procédés', 'GP', 'Formation en procédés industriels, chimie et transformation de la matière'),
  ('Génie Énergétique', 'GE', 'Formation en production, distribution et gestion de l''énergie'),
  ('Génie Automobile et Mécatronique', 'GAM', 'Formation en systèmes automobiles, mécatronique et véhicules intelligents'),
  ('Génie Maritime et Portuaire', 'GMP', 'Formation en ingénierie maritime, portuaire et transport maritime'),
  ('Génie de la Qualité, Hygiène, Sécurité et Environnement Industriel', 'QHSEI', 'Formation en management de la qualité, HSE et développement durable'),
  ('Génie Physique', 'GPH', 'Formation en physique appliquée, instrumentation et technologies biomédicales');

-- Vérification
SELECT code, name FROM departments ORDER BY code;
