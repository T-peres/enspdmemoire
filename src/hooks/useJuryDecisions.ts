import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { JuryDecisionData } from '@/types/database';
import { toast } from 'sonner';

export function useJuryDecisions(themeId?: string) {
  return useQuery({
    queryKey: ['jury-decisions', themeId],
    queryFn: async () => {
      let query = supabase
        .from('jury_decisions')
        .select(`
          *,
          theme:themes(*),
          student:profiles!jury_decisions_student_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (themeId) {
        query = query.eq('theme_id', themeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as JuryDecisionData[];
    },
  });
}

export function useJuryDecision(themeId: string) {
  return useQuery({
    queryKey: ['jury-decision', themeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jury_decisions')
        .select(`
          *,
          theme:themes(*),
          student:profiles!jury_decisions_student_id_fkey(*)
        `)
        .eq('theme_id', themeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as JuryDecisionData | null;
    },
    enabled: !!themeId,
  });
}

export function useCreateJuryDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (decision: Partial<JuryDecisionData>) => {
      const { data, error } = await supabase
        .from('jury_decisions')
        .insert(decision)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jury-decisions'] });
      toast.success('Décision du jury enregistrée');
    },
    onError: (error) => {
      console.error('Error creating jury decision:', error);
      toast.error('Erreur lors de l\'enregistrement de la décision');
    },
  });
}

export function useUpdateJuryDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      decisionId,
      updates,
    }: {
      decisionId: string;
      updates: Partial<JuryDecisionData>;
    }) => {
      const { data, error } = await supabase
        .from('jury_decisions')
        .update(updates)
        .eq('id', decisionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jury-decisions'] });
      toast.success('Décision mise à jour');
    },
    onError: (error) => {
      console.error('Error updating jury decision:', error);
      toast.error('Erreur lors de la mise à jour de la décision');
    },
  });
}

export function useValidateCorrections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      decisionId,
      validatedBy,
    }: {
      decisionId: string;
      validatedBy: string;
    }) => {
      const { data, error } = await supabase
        .from('jury_decisions')
        .update({
          corrections_completed: true,
          corrections_validated_at: new Date().toISOString(),
          corrections_validated_by: validatedBy,
        })
        .eq('id', decisionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jury-decisions'] });
      toast.success('Corrections validées');
    },
    onError: (error) => {
      console.error('Error validating corrections:', error);
      toast.error('Erreur lors de la validation des corrections');
    },
  });
}
