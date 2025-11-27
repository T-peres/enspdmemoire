import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FicheSuivi } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useFicheSuivi(themeId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ficheSuivi, isLoading } = useQuery({
    queryKey: ['fiche-suivi', themeId],
    queryFn: async () => {
      if (!themeId) return null;

      const { data, error } = await supabase
        .from('fiche_suivi')
        .select(`
          *,
          theme:themes(id, title, status),
          student:profiles!fiche_suivi_student_id_fkey(id, first_name, last_name, email),
          supervisor:profiles!fiche_suivi_supervisor_id_fkey(id, first_name, last_name, email)
        `)
        .eq('theme_id', themeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as FicheSuivi | null;
    },
    enabled: !!themeId,
  });

  const updateFicheSuivi = useMutation({
    mutationFn: async (updates: Partial<FicheSuivi> & { theme_id: string }) => {
      const { theme_id, ...rest } = updates;
      
      // Vérifier si la fiche existe
      const { data: existing } = await supabase
        .from('fiche_suivi')
        .select('id')
        .eq('theme_id', theme_id)
        .single();

      let result;
      if (existing) {
        // Mise à jour
        const { data, error } = await supabase
          .from('fiche_suivi')
          .update({ ...rest, last_updated_by: user?.id })
          .eq('theme_id', theme_id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Création
        const { data, error } = await supabase
          .from('fiche_suivi')
          .insert([{ ...rest, theme_id, last_updated_by: user?.id }])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiche-suivi'] });
      toast.success('Fiche de suivi mise à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const validateBySupervisor = useMutation({
    mutationFn: async (themeId: string) => {
      const { data, error } = await supabase
        .from('fiche_suivi')
        .update({
          supervisor_validated: true,
          supervisor_validation_date: new Date().toISOString(),
          last_updated_by: user?.id,
        })
        .eq('theme_id', themeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiche-suivi'] });
      toast.success('Validation enregistrée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const validateByDepartmentHead = useMutation({
    mutationFn: async ({ themeId, comments }: { themeId: string; comments?: string }) => {
      const { data, error } = await supabase
        .from('fiche_suivi')
        .update({
          department_head_validated: true,
          department_head_validation_date: new Date().toISOString(),
          department_head_comments: comments,
          last_updated_by: user?.id,
        })
        .eq('theme_id', themeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiche-suivi'] });
      toast.success('Validation du Chef de Département enregistrée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    ficheSuivi,
    isLoading,
    updateFicheSuivi,
    validateBySupervisor,
    validateByDepartmentHead,
  };
}
