import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlagiarismReport } from '@/types/database';
import { toast } from 'sonner';

export function usePlagiarismReports(documentId?: string) {
  return useQuery({
    queryKey: ['plagiarism-reports', documentId],
    queryFn: async () => {
      let query = supabase
        .from('plagiarism_reports')
        .select(`
          *,
          document:documents(*),
          theme:themes(*),
          student:profiles!plagiarism_reports_student_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (documentId) {
        query = query.eq('document_id', documentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PlagiarismReport[];
    },
    enabled: !!documentId,
  });
}

export function useCreatePlagiarismCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      themeId,
      studentId,
    }: {
      documentId: string;
      themeId: string;
      studentId: string;
    }) => {
      // Récupérer le seuil de plagiat depuis les paramètres système
      const { data: settings } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'plagiarism_threshold')
        .single();

      const threshold = settings?.value ? parseFloat(settings.value) : 20.0;

      // Créer le rapport de plagiat
      const { data, error } = await supabase
        .from('plagiarism_reports')
        .insert({
          document_id: documentId,
          theme_id: themeId,
          student_id: studentId,
          status: 'pending',
          threshold_used: threshold,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plagiarism-reports'] });
      toast.success('Contrôle de plagiat lancé');
    },
    onError: (error) => {
      console.error('Error creating plagiarism check:', error);
      toast.error('Erreur lors du lancement du contrôle de plagiat');
    },
  });
}

export function useUpdatePlagiarismReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      plagiarismScore,
      sourcesFound,
      details,
      notes,
    }: {
      reportId: string;
      plagiarismScore: number;
      sourcesFound: number;
      details?: any;
      notes?: string;
    }) => {
      // Récupérer le rapport pour obtenir le seuil
      const { data: report } = await supabase
        .from('plagiarism_reports')
        .select('threshold_used')
        .eq('id', reportId)
        .single();

      const threshold = report?.threshold_used || 20.0;
      const passed = plagiarismScore < threshold;

      const { data, error } = await supabase
        .from('plagiarism_reports')
        .update({
          plagiarism_score: plagiarismScore,
          sources_found: sourcesFound,
          details,
          notes,
          passed,
          status: 'in_progress',
          checked_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plagiarism-reports'] });
      toast.success('Rapport de plagiat mis à jour');
    },
    onError: (error) => {
      console.error('Error updating plagiarism report:', error);
      toast.error('Erreur lors de la mise à jour du rapport');
    },
  });
}

export function useCompletePlagiarismCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      passed,
    }: {
      reportId: string;
      passed: boolean;
    }) => {
      const { data, error } = await supabase
        .from('plagiarism_reports')
        .update({
          status: passed ? 'passed' : 'failed',
          passed,
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plagiarism-reports'] });
      if (data.passed) {
        toast.success('Contrôle de plagiat réussi');
      } else {
        toast.error('Contrôle de plagiat échoué - Corrections requises');
      }
    },
    onError: (error) => {
      console.error('Error completing plagiarism check:', error);
      toast.error('Erreur lors de la finalisation du contrôle');
    },
  });
}

// Fonction utilitaire pour simuler un contrôle de plagiat
// Dans une vraie application, cela appellerait une API externe (Turnitin, Compilatio, etc.)
export async function simulatePlagiarismCheck(documentId: string): Promise<{
  score: number;
  sourcesFound: number;
  details: any;
}> {
  // Simulation d'un délai de traitement
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Générer un score aléatoire entre 0 et 30%
  const score = Math.random() * 30;
  const sourcesFound = Math.floor(Math.random() * 10);

  const details = {
    sources: Array.from({ length: sourcesFound }, (_, i) => ({
      url: `https://example.com/source-${i + 1}`,
      similarity: Math.random() * 10,
      matched_text: `Texte correspondant ${i + 1}`,
    })),
  };

  return { score, sourcesFound, details };
}
