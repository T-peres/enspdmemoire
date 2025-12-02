-- =====================================================
-- Migration: Ajout et correction des politiques RLS
-- Description: Renforcer la sécurité avec des politiques RLS complètes
-- Date: 2025-12-01
-- =====================================================

-- ===== CORRECTION 1: Renforcer RLS sur defense_sessions =====

DO $$
BEGIN
  -- Vérifier si la table defense_sessions existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_sessions'
  ) THEN
    -- Supprimer les anciennes politiques
    DROP POLICY IF EXISTS "Department heads can view department defenses" ON defense_sessions;
    DROP POLICY IF EXISTS "Students can view own defense" ON defense_sessions;
    DROP POLICY IF EXISTS "Jury members can view assigned defenses" ON defense_sessions;
    DROP POLICY IF EXISTS "Supervisors can view student defenses" ON defense_sessions;
    DROP POLICY IF EXISTS "Department heads can create defenses" ON defense_sessions;
    DROP POLICY IF EXISTS "Department heads can update defenses" ON defense_sessions;

    -- Politique: Les étudiants peuvent voir leur propre soutenance
    CREATE POLICY "Students can view own defense"
      ON defense_sessions FOR SELECT
      TO authenticated
      USING (student_id = auth.uid());

    -- Politique: Les encadreurs peuvent voir les soutenances de leurs étudiants
    CREATE POLICY "Supervisors can view student defenses"
      ON defense_sessions FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM supervisor_assignments sa
          WHERE sa.student_id = defense_sessions.student_id
            AND sa.supervisor_id = auth.uid()
            AND sa.is_active = TRUE
        )
      );

    -- Politique: Les membres du jury peuvent voir les soutenances assignées
    CREATE POLICY "Jury members can view assigned defenses"
      ON defense_sessions FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM defense_jury_members djm
          WHERE djm.defense_session_id = defense_sessions.id
            AND djm.jury_member_id = auth.uid()
        )
      );

    -- Politique: Les chefs de département peuvent voir toutes les soutenances de leur département
    CREATE POLICY "Department heads can view department defenses"
      ON defense_sessions FOR SELECT
      TO authenticated
      USING (
        department_id IN (
          SELECT department_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
        )
      );

    -- Politique: Les chefs de département peuvent créer des soutenances
    CREATE POLICY "Department heads can create defenses"
      ON defense_sessions FOR INSERT
      TO authenticated
      WITH CHECK (
        department_id IN (
          SELECT department_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
        )
      );

    -- Politique: Les chefs de département peuvent modifier les soutenances
    CREATE POLICY "Department heads can update defenses"
      ON defense_sessions FOR UPDATE
      TO authenticated
      USING (
        department_id IN (
          SELECT department_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
        )
      );
    
    RAISE NOTICE '✅ Politiques RLS créées sur defense_sessions';
  ELSE
    RAISE WARNING '⚠️ Table defense_sessions non trouvée - politiques RLS non créées';
  END IF;
END $$;


-- ===== CORRECTION 2: Renforcer RLS sur themes =====

DO $$
BEGIN
  -- Vérifier si themes est une TABLE (pas une vue)
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'themes'
  ) THEN
    -- Supprimer les anciennes politiques
    DROP POLICY IF EXISTS "Students can view own theme" ON themes;
    DROP POLICY IF EXISTS "Supervisors can view assigned themes" ON themes;
    DROP POLICY IF EXISTS "Department heads can view department themes" ON themes;
    DROP POLICY IF EXISTS "Students can create own theme" ON themes;
    DROP POLICY IF EXISTS "Students can update own theme" ON themes;

    -- Politique: Les étudiants peuvent voir leur propre thème
    CREATE POLICY "Students can view own theme"
      ON themes FOR SELECT
      TO authenticated
      USING (student_id = auth.uid());

    -- Politique: Les encadreurs peuvent voir les thèmes de leurs étudiants
    CREATE POLICY "Supervisors can view assigned themes"
      ON themes FOR SELECT
      TO authenticated
      USING (
        supervisor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM supervisor_assignments sa
          WHERE sa.student_id = themes.student_id
            AND sa.supervisor_id = auth.uid()
            AND sa.is_active = TRUE
        )
      );

    -- Politique: Les chefs de département peuvent voir tous les thèmes de leur département
    CREATE POLICY "Department heads can view department themes"
      ON themes FOR SELECT
      TO authenticated
      USING (
        department_id IN (
          SELECT department_id FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
        )
      );

    -- Politique: Les étudiants peuvent créer leur thème
    CREATE POLICY "Students can create own theme"
      ON themes FOR INSERT
      TO authenticated
      WITH CHECK (student_id = auth.uid());

    -- Politique: Les étudiants peuvent modifier leur thème (si non validé)
    CREATE POLICY "Students can update own theme"
      ON themes FOR UPDATE
      TO authenticated
      USING (
        student_id = auth.uid()
        AND status != 'approved'
      );
    
    RAISE NOTICE '✅ Politiques RLS créées sur themes';
  ELSE
    RAISE WARNING '⚠️ themes est une vue ou n''existe pas - politiques RLS non créées';
    RAISE WARNING '⚠️ Les politiques RLS doivent être créées sur la table sous-jacente (thesis_topics)';
  END IF;
END $$;


-- ===== CORRECTION 3: Renforcer RLS sur documents =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'documents'
  ) THEN
    DROP POLICY IF EXISTS "Students can view own documents" ON documents;
    DROP POLICY IF EXISTS "Supervisors can view student documents" ON documents;
    DROP POLICY IF EXISTS "Department heads can view department documents" ON documents;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'documents'
  ) THEN
    -- Politique: Les étudiants peuvent voir leurs propres documents
    CREATE POLICY "Students can view own documents"
      ON documents FOR SELECT
      TO authenticated
      USING (student_id = auth.uid());

    -- Politique: Les encadreurs peuvent voir les documents de leurs étudiants
    CREATE POLICY "Supervisors can view student documents"
      ON documents FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM supervisor_assignments sa
          WHERE sa.student_id = documents.student_id
            AND sa.supervisor_id = auth.uid()
            AND sa.is_active = TRUE
        )
      );
  END IF;
END $$;

-- Politique: Les membres du jury peuvent voir les documents des soutenances assignées
-- Note: Cette politique nécessite les tables defense_sessions et defense_jury_members
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_sessions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_jury_members'
  ) THEN
    CREATE POLICY "Jury can view defense documents"
      ON documents FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM defense_sessions ds
          JOIN defense_jury_members djm ON djm.defense_session_id = ds.id
          WHERE ds.student_id = documents.student_id
            AND djm.jury_member_id = auth.uid()
        )
      );
    
    RAISE NOTICE '✅ Politique RLS jury créée sur documents';
  ELSE
    RAISE WARNING '⚠️ Tables defense_sessions ou defense_jury_members manquantes - politique jury non créée';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'documents'
  ) THEN
    -- Politique: Les chefs de département peuvent voir tous les documents de leur département
    CREATE POLICY "Department heads can view department documents"
      ON documents FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = documents.student_id
            AND p.department_id IN (
              SELECT department_id FROM profiles WHERE id = auth.uid()
            )
        )
        AND EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
        )
      );

    -- Politique: Les étudiants peuvent créer leurs documents
    CREATE POLICY "Students can create own documents"
      ON documents FOR INSERT
      TO authenticated
      WITH CHECK (student_id = auth.uid());

    -- Politique: Les étudiants peuvent modifier leurs documents (si non approuvés)
    CREATE POLICY "Students can update own documents"
      ON documents FOR UPDATE
      TO authenticated
      USING (
        student_id = auth.uid()
        AND status != 'approved'
      );
    
    RAISE NOTICE '✅ Politiques RLS créées sur documents';
  ELSE
    RAISE WARNING '⚠️ Table documents non trouvée - politiques RLS non créées';
  END IF;
END $$;


-- ===== CORRECTION 4: Renforcer RLS sur fiche_suivi =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fiche_suivi'
  ) THEN
    DROP POLICY IF EXISTS "Students can view own fiche" ON fiche_suivi;
    DROP POLICY IF EXISTS "Supervisors can view student fiches" ON fiche_suivi;
    DROP POLICY IF EXISTS "Department heads can view department fiches" ON fiche_suivi;
    DROP POLICY IF EXISTS "Supervisors can update student fiches" ON fiche_suivi;
    DROP POLICY IF EXISTS "Department heads can validate fiches" ON fiche_suivi;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fiche_suivi'
  ) THEN
    -- Politique: Les étudiants peuvent voir leurs propres fiches
    CREATE POLICY "Students can view own fiche"
      ON fiche_suivi FOR SELECT
      TO authenticated
      USING (student_id = auth.uid());

    -- Politique: Les encadreurs peuvent voir et modifier les fiches de leurs étudiants
    CREATE POLICY "Supervisors can view student fiches"
      ON fiche_suivi FOR SELECT
      TO authenticated
      USING (supervisor_id = auth.uid());

    CREATE POLICY "Supervisors can update student fiches"
      ON fiche_suivi FOR UPDATE
      TO authenticated
      USING (supervisor_id = auth.uid())
      WITH CHECK (supervisor_id = auth.uid());

    -- Politique: Les chefs de département peuvent voir et valider toutes les fiches
    CREATE POLICY "Department heads can view department fiches"
      ON fiche_suivi FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = fiche_suivi.student_id
            AND p.department_id IN (
              SELECT department_id FROM profiles WHERE id = auth.uid()
            )
        )
        AND EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
        )
      );

    CREATE POLICY "Department heads can validate fiches"
      ON fiche_suivi FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = fiche_suivi.student_id
            AND p.department_id IN (
              SELECT department_id FROM profiles WHERE id = auth.uid()
            )
        )
        AND EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
        )
      );
    
    RAISE NOTICE '✅ Politiques RLS créées sur fiche_suivi';
  ELSE
    RAISE WARNING '⚠️ Table fiche_suivi non trouvée - politiques RLS non créées';
  END IF;
END $$;


-- ===== CORRECTION 5: Renforcer RLS sur final_grades =====

DO $$
BEGIN
  -- Vérifier si la table final_grades existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'final_grades'
  ) THEN
    -- Supprimer les anciennes politiques
    DROP POLICY IF EXISTS "Students can view own grades" ON final_grades;
    DROP POLICY IF EXISTS "Supervisors can view student grades" ON final_grades;
    DROP POLICY IF EXISTS "Jury can manage grades" ON final_grades;
    DROP POLICY IF EXISTS "Students can view own published grades" ON final_grades;
    DROP POLICY IF EXISTS "Jury can view defense grades" ON final_grades;
    DROP POLICY IF EXISTS "Jury can update defense grades" ON final_grades;
    DROP POLICY IF EXISTS "Department heads can view all grades" ON final_grades;

    -- Politique: Les étudiants peuvent voir leurs propres notes (si publiées)
    CREATE POLICY "Students can view own published grades"
      ON final_grades FOR SELECT
      TO authenticated
      USING (
        student_id = auth.uid()
        AND is_published = TRUE
      );

    -- Politique: Les encadreurs peuvent voir les notes de leurs étudiants
    CREATE POLICY "Supervisors can view student grades"
      ON final_grades FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM supervisor_assignments sa
          WHERE sa.student_id = final_grades.student_id
            AND sa.supervisor_id = auth.uid()
            AND sa.is_active = TRUE
        )
      );

    -- Politique: Les chefs de département peuvent voir toutes les notes
    CREATE POLICY "Department heads can view all grades"
      ON final_grades FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = final_grades.student_id
            AND p.department_id IN (
              SELECT department_id FROM profiles WHERE id = auth.uid()
            )
        )
        AND EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
        )
      );

    -- Politiques jury (conditionnelles)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'defense_sessions'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'defense_jury_members'
    ) THEN
      CREATE POLICY "Jury can view defense grades"
        ON final_grades FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM defense_sessions ds
            JOIN defense_jury_members djm ON djm.defense_session_id = ds.id
            WHERE ds.student_id = final_grades.student_id
              AND djm.jury_member_id = auth.uid()
          )
        );

      CREATE POLICY "Jury can update defense grades"
        ON final_grades FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM defense_sessions ds
            JOIN defense_jury_members djm ON djm.defense_session_id = ds.id
            WHERE ds.student_id = final_grades.student_id
              AND djm.jury_member_id = auth.uid()
          )
        );
      
      RAISE NOTICE '✅ Politiques RLS créées sur final_grades (avec jury)';
    ELSE
      RAISE NOTICE '✅ Politiques RLS créées sur final_grades (sans jury)';
    END IF;
  ELSE
    RAISE WARNING '⚠️ Table final_grades non trouvée - politiques RLS non créées';
  END IF;
END $$;


-- ===== CORRECTION 6: RLS sur report_submissions =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'report_submissions'
  ) THEN
    ALTER TABLE report_submissions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Students can view own submissions" ON report_submissions;
    DROP POLICY IF EXISTS "Supervisors can view student submissions" ON report_submissions;
    DROP POLICY IF EXISTS "Students can create submissions" ON report_submissions;

    CREATE POLICY "Students can view own submissions"
      ON report_submissions FOR SELECT
      TO authenticated
      USING (student_id = auth.uid());

    CREATE POLICY "Students can create submissions"
      ON report_submissions FOR INSERT
      TO authenticated
      WITH CHECK (student_id = auth.uid());

    CREATE POLICY "Supervisors can view student submissions"
      ON report_submissions FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM supervisor_assignments sa
          WHERE sa.student_id = report_submissions.student_id
            AND sa.supervisor_id = auth.uid()
            AND sa.is_active = TRUE
        )
      );
    
    RAISE NOTICE '✅ Politiques RLS créées sur report_submissions';
  ELSE
    RAISE WARNING '⚠️ Table report_submissions non trouvée - politiques RLS non créées';
  END IF;
END $$;


-- ===== CORRECTION 7: RLS sur plagiarism_reports =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'plagiarism_reports'
  ) THEN
    ALTER TABLE plagiarism_reports ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Students can view own plagiarism reports" ON plagiarism_reports;
    DROP POLICY IF EXISTS "Supervisors can view student plagiarism reports" ON plagiarism_reports;
    DROP POLICY IF EXISTS "Department heads can view all plagiarism reports" ON plagiarism_reports;

    CREATE POLICY "Students can view own plagiarism reports"
      ON plagiarism_reports FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM report_submissions rs
          WHERE rs.id = plagiarism_reports.report_submission_id
            AND rs.student_id = auth.uid()
        )
      );

    CREATE POLICY "Supervisors can view student plagiarism reports"
      ON plagiarism_reports FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM report_submissions rs
          JOIN supervisor_assignments sa ON sa.student_id = rs.student_id
          WHERE rs.id = plagiarism_reports.report_submission_id
            AND sa.supervisor_id = auth.uid()
            AND sa.is_active = TRUE
        )
      );

    CREATE POLICY "Department heads can view all plagiarism reports"
      ON plagiarism_reports FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
        )
      );
    
    RAISE NOTICE '✅ Politiques RLS créées sur plagiarism_reports';
  ELSE
    RAISE WARNING '⚠️ Table plagiarism_reports non trouvée - politiques RLS non créées';
  END IF;
END $$;


-- ===== CORRECTION 8: RLS sur defense_minutes =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_minutes'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_sessions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'defense_jury_members'
  ) THEN
    ALTER TABLE defense_minutes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Students can view own defense minutes" ON defense_minutes;
    DROP POLICY IF EXISTS "Jury can manage defense minutes" ON defense_minutes;
    DROP POLICY IF EXISTS "Jury can view defense minutes" ON defense_minutes;
    DROP POLICY IF EXISTS "Jury can create defense minutes" ON defense_minutes;
    DROP POLICY IF EXISTS "Department heads can view all defense minutes" ON defense_minutes;

    CREATE POLICY "Students can view own defense minutes"
      ON defense_minutes FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM defense_sessions ds
          WHERE ds.id = defense_minutes.defense_session_id
            AND ds.student_id = auth.uid()
        )
      );

    CREATE POLICY "Jury can view defense minutes"
      ON defense_minutes FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM defense_jury_members djm
          WHERE djm.defense_session_id = defense_minutes.defense_session_id
            AND djm.jury_member_id = auth.uid()
        )
      );

    CREATE POLICY "Jury can create defense minutes"
      ON defense_minutes FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM defense_jury_members djm
          WHERE djm.defense_session_id = defense_minutes.defense_session_id
            AND djm.jury_member_id = auth.uid()
            AND djm.role = 'president'
        )
      );

    CREATE POLICY "Department heads can view all defense minutes"
      ON defense_minutes FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'department_head'
        )
      );
    
    RAISE NOTICE '✅ Politiques RLS créées sur defense_minutes';
  ELSE
    RAISE WARNING '⚠️ Tables defense_minutes, defense_sessions ou defense_jury_members manquantes - politiques RLS non créées';
  END IF;
END $$;


-- ===== Fonction helper pour vérifier les permissions =====

CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := FALSE;
BEGIN
  -- Vérifier selon le type de ressource
  CASE p_resource_type
    WHEN 'theme' THEN
      SELECT EXISTS (
        SELECT 1 FROM themes
        WHERE id = p_resource_id
          AND (student_id = p_user_id OR supervisor_id = p_user_id)
      ) INTO v_has_permission;
    
    WHEN 'document' THEN
      SELECT EXISTS (
        SELECT 1 FROM documents
        WHERE id = p_resource_id
          AND (student_id = p_user_id OR supervisor_id = p_user_id)
      ) INTO v_has_permission;
    
    WHEN 'defense' THEN
      SELECT EXISTS (
        SELECT 1 FROM defense_sessions ds
        LEFT JOIN defense_jury_members djm ON djm.defense_session_id = ds.id
        WHERE ds.id = p_resource_id
          AND (ds.student_id = p_user_id OR djm.jury_member_id = p_user_id)
      ) INTO v_has_permission;
    
    ELSE
      v_has_permission := FALSE;
  END CASE;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Pour annuler cette migration, exécuter:
/*
DROP FUNCTION IF EXISTS check_user_permission(UUID, TEXT, UUID, TEXT);

-- Supprimer toutes les politiques créées
-- (Liste complète des DROP POLICY pour chaque table)
*/
