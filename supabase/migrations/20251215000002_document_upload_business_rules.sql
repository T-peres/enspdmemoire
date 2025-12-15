-- Migration: Document Upload Business Rules
-- Implémente les règles métier pour le dépôt de documents selon le diagramme de classe

-- 1. Créer une fonction de validation des règles métier pour l'upload de documents
CREATE OR REPLACE FUNCTION validate_document_upload(
  p_student_id UUID,
  p_theme_id UUID,
  p_document_type document_type,
  p_file_size BIGINT
) RETURNS JSON AS $$
DECLARE
  v_theme_record RECORD;
  v_student_record RECORD;
  v_existing_docs INTEGER;
  v_fiche_suivi RECORD;
  v_supervisor_assignment RECORD;
  v_validation_result JSON;
  v_errors TEXT[] := '{}';
  v_warnings TEXT[] := '{}';
BEGIN
  -- Vérifier que l'étudiant existe et est actif
  SELECT * INTO v_student_record
  FROM profiles 
  WHERE id = p_student_id AND role = 'student';
  
  IF NOT FOUND THEN
    v_errors := array_append(v_errors, 'Étudiant non trouvé ou rôle incorrect');
  END IF;

  -- Vérifier que le thème existe et est approuvé
  SELECT * INTO v_theme_record
  FROM themes 
  WHERE id = p_theme_id;
  
  IF NOT FOUND THEN
    v_errors := array_append(v_errors, 'Sujet de thèse non trouvé');
  ELSIF v_theme_record.status != 'approved' THEN
    v_errors := array_append(v_errors, 'Le sujet de thèse doit être approuvé avant de déposer des documents');
  ELSIF v_theme_record.student_id != p_student_id THEN
    v_errors := array_append(v_errors, 'Ce sujet de thèse ne vous est pas assigné');
  END IF;

  -- Vérifier l'assignation d'encadreur
  SELECT * INTO v_supervisor_assignment
  FROM supervisor_assignments 
  WHERE student_id = p_student_id AND supervisor_id = v_theme_record.supervisor_id;
  
  IF NOT FOUND THEN
    v_errors := array_append(v_errors, 'Aucun encadreur assigné pour ce sujet');
  END IF;

  -- Vérifier la fiche de suivi
  SELECT * INTO v_fiche_suivi
  FROM fiche_suivi 
  WHERE student_id = p_student_id;
  
  IF NOT FOUND THEN
    v_warnings := array_append(v_warnings, 'Aucune fiche de suivi trouvée - elle sera créée automatiquement');
  END IF;

  -- Règles spécifiques par type de document
  CASE p_document_type
    WHEN 'plan' THEN
      -- Le plan peut être déposé à tout moment après approbation du sujet
      NULL;
      
    WHEN 'chapter_1' THEN
      -- Vérifier qu'un plan a été approuvé
      SELECT COUNT(*) INTO v_existing_docs
      FROM documents 
      WHERE theme_id = p_theme_id 
        AND document_type = 'plan' 
        AND status = 'approved';
      
      IF v_existing_docs = 0 THEN
        v_errors := array_append(v_errors, 'Un plan détaillé doit être approuvé avant de déposer le chapitre 1');
      END IF;
      
    WHEN 'chapter_2' THEN
      -- Vérifier que le chapitre 1 a été approuvé
      SELECT COUNT(*) INTO v_existing_docs
      FROM documents 
      WHERE theme_id = p_theme_id 
        AND document_type = 'chapter_1' 
        AND status = 'approved';
      
      IF v_existing_docs = 0 THEN
        v_errors := array_append(v_errors, 'Le chapitre 1 doit être approuvé avant de déposer le chapitre 2');
      END IF;
      
    WHEN 'chapter_3' THEN
      -- Vérifier que le chapitre 2 a été approuvé
      SELECT COUNT(*) INTO v_existing_docs
      FROM documents 
      WHERE theme_id = p_theme_id 
        AND document_type = 'chapter_2' 
        AND status = 'approved';
      
      IF v_existing_docs = 0 THEN
        v_errors := array_append(v_errors, 'Le chapitre 2 doit être approuvé avant de déposer le chapitre 3');
      END IF;
      
    WHEN 'chapter_4' THEN
      -- Vérifier que le chapitre 3 a été approuvé
      SELECT COUNT(*) INTO v_existing_docs
      FROM documents 
      WHERE theme_id = p_theme_id 
        AND document_type = 'chapter_3' 
        AND status = 'approved';
      
      IF v_existing_docs = 0 THEN
        v_errors := array_append(v_errors, 'Le chapitre 3 doit être approuvé avant de déposer le chapitre 4');
      END IF;
      
    WHEN 'final_version' THEN
      -- Vérifier que tous les chapitres ont été approuvés
      SELECT COUNT(*) INTO v_existing_docs
      FROM documents 
      WHERE theme_id = p_theme_id 
        AND document_type IN ('plan', 'chapter_1', 'chapter_2', 'chapter_3', 'chapter_4')
        AND status = 'approved';
      
      IF v_existing_docs < 5 THEN
        v_errors := array_append(v_errors, 'Tous les chapitres (plan + 4 chapitres) doivent être approuvés avant la version finale');
      END IF;
      
      -- Vérifier le progrès minimum dans la fiche de suivi
      IF v_fiche_suivi.overall_progress < 80 THEN
        v_warnings := array_append(v_warnings, 'Le progrès global est inférieur à 80% - assurez-vous que votre travail est suffisamment avancé');
      END IF;
  END CASE;

  -- Vérifier qu'il n'y a pas déjà un document du même type en attente
  SELECT COUNT(*) INTO v_existing_docs
  FROM documents 
  WHERE theme_id = p_theme_id 
    AND document_type = p_document_type 
    AND status IN ('submitted', 'under_review');
  
  IF v_existing_docs > 0 THEN
    v_errors := array_append(v_errors, 'Un document de ce type est déjà en cours de révision');
  END IF;

  -- Vérifier la taille du fichier (50MB max)
  IF p_file_size > 52428800 THEN -- 50MB en bytes
    v_errors := array_append(v_errors, 'Le fichier ne doit pas dépasser 50 MB');
  END IF;

  -- Construire le résultat
  v_validation_result := json_build_object(
    'valid', array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0,
    'errors', v_errors,
    'warnings', v_warnings,
    'theme_title', v_theme_record.title,
    'supervisor_name', (
      SELECT first_name || ' ' || last_name 
      FROM profiles 
      WHERE id = v_theme_record.supervisor_id
    ),
    'student_progress', COALESCE(v_fiche_suivi.overall_progress, 0)
  );

  RETURN v_validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Créer une fonction pour obtenir les prérequis d'un type de document
CREATE OR REPLACE FUNCTION get_document_prerequisites(p_document_type document_type)
RETURNS JSON AS $$
BEGIN
  CASE p_document_type
    WHEN 'plan' THEN
      RETURN json_build_object(
        'required_documents', '[]'::json,
        'description', 'Le plan détaillé peut être déposé dès que le sujet est approuvé',
        'min_progress', 0
      );
      
    WHEN 'chapter_1' THEN
      RETURN json_build_object(
        'required_documents', '["plan"]'::json,
        'description', 'Le plan détaillé doit être approuvé',
        'min_progress', 20
      );
      
    WHEN 'chapter_2' THEN
      RETURN json_build_object(
        'required_documents', '["plan", "chapter_1"]'::json,
        'description', 'Le plan et le chapitre 1 doivent être approuvés',
        'min_progress', 40
      );
      
    WHEN 'chapter_3' THEN
      RETURN json_build_object(
        'required_documents', '["plan", "chapter_1", "chapter_2"]'::json,
        'description', 'Le plan et les chapitres 1-2 doivent être approuvés',
        'min_progress', 60
      );
      
    WHEN 'chapter_4' THEN
      RETURN json_build_object(
        'required_documents', '["plan", "chapter_1", "chapter_2", "chapter_3"]'::json,
        'description', 'Le plan et les chapitres 1-3 doivent être approuvés',
        'min_progress', 80
      );
      
    WHEN 'final_version' THEN
      RETURN json_build_object(
        'required_documents', '["plan", "chapter_1", "chapter_2", "chapter_3", "chapter_4"]'::json,
        'description', 'Tous les chapitres doivent être approuvés',
        'min_progress', 90
      );
      
    ELSE
      RETURN json_build_object(
        'required_documents', '[]'::json,
        'description', 'Type de document non reconnu',
        'min_progress', 0
      );
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 3. Créer une vue pour le statut des documents par étudiant
CREATE OR REPLACE VIEW student_document_status AS
SELECT 
  t.student_id,
  t.id as theme_id,
  t.title as theme_title,
  t.status as theme_status,
  t.supervisor_id,
  p_sup.first_name || ' ' || p_sup.last_name as supervisor_name,
  
  -- Statut par type de document
  MAX(CASE WHEN d.document_type = 'plan' THEN d.status END) as plan_status,
  MAX(CASE WHEN d.document_type = 'chapter_1' THEN d.status END) as chapter_1_status,
  MAX(CASE WHEN d.document_type = 'chapter_2' THEN d.status END) as chapter_2_status,
  MAX(CASE WHEN d.document_type = 'chapter_3' THEN d.status END) as chapter_3_status,
  MAX(CASE WHEN d.document_type = 'chapter_4' THEN d.status END) as chapter_4_status,
  MAX(CASE WHEN d.document_type = 'final_version' THEN d.status END) as final_version_status,
  
  -- Dates de soumission
  MAX(CASE WHEN d.document_type = 'plan' THEN d.submitted_at END) as plan_submitted_at,
  MAX(CASE WHEN d.document_type = 'chapter_1' THEN d.submitted_at END) as chapter_1_submitted_at,
  MAX(CASE WHEN d.document_type = 'chapter_2' THEN d.submitted_at END) as chapter_2_submitted_at,
  MAX(CASE WHEN d.document_type = 'chapter_3' THEN d.submitted_at END) as chapter_3_submitted_at,
  MAX(CASE WHEN d.document_type = 'chapter_4' THEN d.submitted_at END) as chapter_4_submitted_at,
  MAX(CASE WHEN d.document_type = 'final_version' THEN d.submitted_at END) as final_version_submitted_at,
  
  -- Progrès global
  COALESCE(fs.overall_progress, 0) as overall_progress,
  
  -- Prochaine étape autorisée
  CASE 
    WHEN MAX(CASE WHEN d.document_type = 'final_version' AND d.status = 'approved' THEN 1 ELSE 0 END) = 1 THEN 'defense_ready'
    WHEN MAX(CASE WHEN d.document_type = 'chapter_4' AND d.status = 'approved' THEN 1 ELSE 0 END) = 1 THEN 'final_version'
    WHEN MAX(CASE WHEN d.document_type = 'chapter_3' AND d.status = 'approved' THEN 1 ELSE 0 END) = 1 THEN 'chapter_4'
    WHEN MAX(CASE WHEN d.document_type = 'chapter_2' AND d.status = 'approved' THEN 1 ELSE 0 END) = 1 THEN 'chapter_3'
    WHEN MAX(CASE WHEN d.document_type = 'chapter_1' AND d.status = 'approved' THEN 1 ELSE 0 END) = 1 THEN 'chapter_2'
    WHEN MAX(CASE WHEN d.document_type = 'plan' AND d.status = 'approved' THEN 1 ELSE 0 END) = 1 THEN 'chapter_1'
    WHEN t.status = 'approved' THEN 'plan'
    ELSE 'theme_approval_required'
  END as next_allowed_document

FROM themes t
LEFT JOIN documents d ON d.theme_id = t.id
LEFT JOIN profiles p_sup ON p_sup.id = t.supervisor_id
LEFT JOIN fiche_suivi fs ON fs.student_id = t.student_id
WHERE t.status = 'approved'
GROUP BY t.student_id, t.id, t.title, t.status, t.supervisor_id, p_sup.first_name, p_sup.last_name, fs.overall_progress;

-- 4. Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_documents_theme_type_status ON documents(theme_id, document_type, status);
CREATE INDEX IF NOT EXISTS idx_documents_student_type ON documents(student_id, document_type);

-- 5. Ajouter des commentaires pour la documentation
COMMENT ON FUNCTION validate_document_upload IS 'Valide les règles métier pour le dépôt de documents selon le workflow de soutenance';
COMMENT ON FUNCTION get_document_prerequisites IS 'Retourne les prérequis pour déposer un type de document donné';
COMMENT ON VIEW student_document_status IS 'Vue consolidée du statut des documents par étudiant avec la prochaine étape autorisée';

-- Test de la fonction de validation
SELECT 'Fonctions de validation créées avec succès' as result;