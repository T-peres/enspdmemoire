import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Theme, ThemeStatus } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useThemes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: themes, isLoading } = useQuery({
    queryKey: ['themes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('themes')
        .select(`
          *,
          student:profiles!themes_student_id_fkey(id, first_name, last_name, email),
          supervisor:profiles!themes_supervisor_id_fkey(id, first_name, last_name, email)
        `)
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Theme[];
    },
    enabled: !!user,
  });

  const createTheme = useMutation({
    mutationFn: async (themeData: Partial<Theme>) => {
      const { data, error } = await supabase
        .from('themes')
        .insert([{ ...themeData, student_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Thème soumis avec succès');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateTheme = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Theme> & { id: string }) => {
      const { data, error } = await supabase
        .from('themes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Thème mis à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    themes,
    isLoading,
    createTheme,
    updateTheme,
  };
}

export function useSupervisorThemes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: themes, isLoading } = useQuery({
    queryKey: ['supervisor-themes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('themes')
        .select(`
          *,
          student:profiles!themes_student_id_fkey(id, first_name, last_name, email, student_id)
        `)
        .eq('supervisor_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Theme[];
    },
    enabled: !!user,
  });

  const reviewTheme = useMutation({
    mutationFn: async ({ 
      themeId, 
      status, 
      notes 
    }: { 
      themeId: string; 
      status: ThemeStatus; 
      notes?: string;
    }) => {
      const updates: any = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      };

      if (status === 'rejected') {
        updates.rejection_reason = notes;
      } else if (status === 'revision_requested') {
        updates.revision_notes = notes;
      }

      const { data, error } = await supabase
        .from('themes')
        .update(updates)
        .eq('id', themeId)
        .select()
        .single();

      if (error) throw error;

      // Créer une notification pour l'étudiant
      const theme = data as Theme;
      await supabase.rpc('create_notification', {
        p_user_id: theme.student_id,
        p_title: `Thème ${status === 'approved' ? 'approuvé' : status === 'rejected' ? 'rejeté' : 'à réviser'}`,
        p_message: `Votre thème "${theme.title}" a été ${status === 'approved' ? 'approuvé' : status === 'rejected' ? 'rejeté' : 'marqué pour révision'}`,
        p_type: status === 'approved' ? 'success' : 'warning',
        p_entity_type: 'theme',
        p_entity_id: themeId,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-themes'] });
      toast.success('Évaluation enregistrée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    themes,
    isLoading,
    reviewTheme,
  };
}
