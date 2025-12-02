-- =====================================================
-- Migration: Extension des types de documents
-- Description: Ajouter de nouveaux types de documents pour couvrir tous les besoins
-- Date: 2025-12-01
-- =====================================================

-- Vérifier si le type document_type existe
DO $$ 
BEGIN
  -- Ajouter les nouveaux types de documents
  -- Note: ALTER TYPE ADD VALUE ne peut pas être exécuté dans un bloc de transaction
  -- Il doit être exécuté directement
END $$;

-- Ajouter les nouveaux types un par un
-- Ces commandes doivent être exécutées en dehors d'un bloc de transaction

-- Type: Annexes (documents supplémentaires)
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'annexes';

-- Type: Bibliographie (références bibliographiques)
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'bibliography';

-- Type: Résumé/Abstract (résumé en français et anglais)
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'abstract';

-- Type: Présentation PowerPoint
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'presentation';

-- Type: Poster scientifique
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'poster';

-- Type: Code source (pour mémoires techniques)
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'source_code';

-- Type: Données de recherche
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'research_data';

-- Type: Vidéo de présentation
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'video_presentation';

-- Type: Autorisation de diffusion
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'diffusion_authorization';

-- Type: Fiche de synthèse
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'summary_sheet';


-- Créer une table de métadonnées pour les types de documents
CREATE TABLE IF NOT EXISTS document_type_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL UNIQUE,
  display_name_fr TEXT NOT NULL,
  display_name_en TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  max_file_size_mb INTEGER DEFAULT 50,
  allowed_extensions TEXT[] DEFAULT ARRAY['.pdf', '.doc', '.docx'],
  icon_name TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer les métadonnées pour tous les types de documents
INSERT INTO document_type_metadata (
  document_type, display_name_fr, display_name_en, description, 
  is_required, max_file_size_mb, allowed_extensions, icon_name, display_order
) VALUES
  ('proposal', 'Proposition de sujet', 'Topic Proposal', 
   'Document de proposition initiale du sujet de mémoire', 
   TRUE, 10, ARRAY['.pdf', '.doc', '.docx'], 'FileText', 1),
  
  ('intermediate_report', 'Rapport intermédiaire', 'Intermediate Report', 
   'Rapport d''avancement à mi-parcours', 
   TRUE, 20, ARRAY['.pdf', '.doc', '.docx'], 'FileEdit', 2),
  
  ('final_report', 'Rapport final', 'Final Report', 
   'Version finale du mémoire', 
   TRUE, 50, ARRAY['.pdf'], 'FileCheck', 3),
  
  ('presentation', 'Présentation', 'Presentation', 
   'Support de présentation pour la soutenance', 
   TRUE, 30, ARRAY['.pdf', '.ppt', '.pptx'], 'Presentation', 4),
  
  ('abstract', 'Résumé/Abstract', 'Abstract', 
   'Résumé du mémoire en français et anglais', 
   TRUE, 5, ARRAY['.pdf', '.doc', '.docx'], 'FileText', 5),
  
  ('bibliography', 'Bibliographie', 'Bibliography', 
   'Liste des références bibliographiques', 
   FALSE, 10, ARRAY['.pdf', '.doc', '.docx', '.bib'], 'Book', 6),
  
  ('annexes', 'Annexes', 'Appendices', 
   'Documents annexes et complémentaires', 
   FALSE, 100, ARRAY['.pdf', '.doc', '.docx', '.zip'], 'Paperclip', 7),
  
  ('poster', 'Poster scientifique', 'Scientific Poster', 
   'Poster de présentation des résultats', 
   FALSE, 20, ARRAY['.pdf', '.png', '.jpg'], 'Image', 8),
  
  ('source_code', 'Code source', 'Source Code', 
   'Code source pour les mémoires techniques', 
   FALSE, 200, ARRAY['.zip', '.tar.gz', '.rar'], 'Code', 9),
  
  ('research_data', 'Données de recherche', 'Research Data', 
   'Jeux de données utilisés dans la recherche', 
   FALSE, 500, ARRAY['.csv', '.xlsx', '.json', '.zip'], 'Database', 10),
  
  ('video_presentation', 'Vidéo de présentation', 'Video Presentation', 
   'Enregistrement vidéo de la présentation', 
   FALSE, 1000, ARRAY['.mp4', '.avi', '.mov'], 'Video', 11),
  
  ('diffusion_authorization', 'Autorisation de diffusion', 'Diffusion Authorization', 
   'Autorisation de diffusion du mémoire', 
   FALSE, 5, ARRAY['.pdf'], 'Shield', 12),
  
  ('summary_sheet', 'Fiche de synthèse', 'Summary Sheet', 
   'Fiche résumant les points clés du mémoire', 
   FALSE, 5, ARRAY['.pdf', '.doc', '.docx'], 'FileText', 13)
ON CONFLICT (document_type) DO UPDATE SET
  display_name_fr = EXCLUDED.display_name_fr,
  display_name_en = EXCLUDED.display_name_en,
  description = EXCLUDED.description,
  is_required = EXCLUDED.is_required,
  max_file_size_mb = EXCLUDED.max_file_size_mb,
  allowed_extensions = EXCLUDED.allowed_extensions,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_document_type_metadata_active ON document_type_metadata(is_active);
CREATE INDEX IF NOT EXISTS idx_document_type_metadata_order ON document_type_metadata(display_order);

-- Commentaires
COMMENT ON TABLE document_type_metadata IS 'Métadonnées et configuration pour chaque type de document';
COMMENT ON COLUMN document_type_metadata.is_required IS 'Indique si ce type de document est obligatoire';
COMMENT ON COLUMN document_type_metadata.max_file_size_mb IS 'Taille maximale du fichier en Mo';
COMMENT ON COLUMN document_type_metadata.allowed_extensions IS 'Extensions de fichiers autorisées';

-- Activer RLS
ALTER TABLE document_type_metadata ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut lire les métadonnées
CREATE POLICY "Anyone can view document type metadata"
  ON document_type_metadata FOR SELECT
  TO authenticated
  USING (TRUE);

-- Politique: Seuls les admins peuvent modifier
CREATE POLICY "Admins can update document type metadata"
  ON document_type_metadata FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Fonction pour obtenir les types de documents requis pour un département
CREATE OR REPLACE FUNCTION get_required_document_types(p_department_id UUID)
RETURNS TABLE(
  document_type TEXT,
  display_name TEXT,
  description TEXT,
  max_file_size_mb INTEGER,
  allowed_extensions TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dtm.document_type,
    dtm.display_name_fr,
    dtm.description,
    dtm.max_file_size_mb,
    dtm.allowed_extensions
  FROM document_type_metadata dtm
  WHERE dtm.is_active = TRUE
    AND (
      dtm.is_required = TRUE
      OR dtm.document_type = ANY(
        SELECT jsonb_array_elements_text(ds.required_document_types)
        FROM department_settings ds
        WHERE ds.department_id = p_department_id
      )
    )
  ORDER BY dtm.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour valider un type de fichier
CREATE OR REPLACE FUNCTION validate_document_type(
  p_document_type TEXT,
  p_file_extension TEXT,
  p_file_size_mb DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_metadata RECORD;
  v_result JSONB;
  v_is_valid BOOLEAN := TRUE;
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Récupérer les métadonnées du type de document
  SELECT * INTO v_metadata
  FROM document_type_metadata
  WHERE document_type = p_document_type;
  
  IF NOT FOUND THEN
    v_is_valid := FALSE;
    v_errors := array_append(v_errors, 'Type de document invalide');
  ELSE
    -- Vérifier l'extension
    IF NOT (p_file_extension = ANY(v_metadata.allowed_extensions)) THEN
      v_is_valid := FALSE;
      v_errors := array_append(v_errors, 
        'Extension non autorisée. Extensions acceptées: ' || array_to_string(v_metadata.allowed_extensions, ', ')
      );
    END IF;
    
    -- Vérifier la taille
    IF p_file_size_mb > v_metadata.max_file_size_mb THEN
      v_is_valid := FALSE;
      v_errors := array_append(v_errors, 
        'Fichier trop volumineux. Taille maximale: ' || v_metadata.max_file_size_mb || ' Mo'
      );
    END IF;
  END IF;
  
  v_result := jsonb_build_object(
    'is_valid', v_is_valid,
    'errors', to_jsonb(v_errors),
    'metadata', to_jsonb(v_metadata)
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si tous les documents requis sont soumis
CREATE OR REPLACE FUNCTION check_required_documents_submitted(p_student_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_department_id UUID;
  v_required_types TEXT[];
  v_submitted_types TEXT[];
  v_missing_types TEXT[];
  v_all_submitted BOOLEAN;
BEGIN
  -- Récupérer le département de l'étudiant
  SELECT department_id INTO v_department_id
  FROM profiles
  WHERE id = p_student_id;
  
  -- Récupérer les types requis
  SELECT array_agg(document_type) INTO v_required_types
  FROM get_required_document_types(v_department_id);
  
  -- Récupérer les types soumis
  SELECT array_agg(DISTINCT document_type) INTO v_submitted_types
  FROM documents
  WHERE student_id = p_student_id
    AND status = 'approved';
  
  -- Calculer les types manquants
  SELECT array_agg(rt) INTO v_missing_types
  FROM unnest(v_required_types) rt
  WHERE rt != ALL(COALESCE(v_submitted_types, ARRAY[]::TEXT[]));
  
  v_all_submitted := (v_missing_types IS NULL OR array_length(v_missing_types, 1) = 0);
  
  RETURN jsonb_build_object(
    'all_submitted', v_all_submitted,
    'required_types', to_jsonb(v_required_types),
    'submitted_types', to_jsonb(COALESCE(v_submitted_types, ARRAY[]::TEXT[])),
    'missing_types', to_jsonb(COALESCE(v_missing_types, ARRAY[]::TEXT[]))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Pour annuler cette migration, exécuter:
/*
DROP FUNCTION IF EXISTS check_required_documents_submitted(UUID);
DROP FUNCTION IF EXISTS validate_document_type(TEXT, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS get_required_document_types(UUID);
DROP POLICY IF EXISTS "Admins can update document type metadata" ON document_type_metadata;
DROP POLICY IF EXISTS "Anyone can view document type metadata" ON document_type_metadata;
DROP TABLE IF EXISTS document_type_metadata CASCADE;

-- Note: Les valeurs ajoutées à l'enum ne peuvent pas être supprimées facilement
-- Il faudrait recréer l'enum et migrer les données
*/
