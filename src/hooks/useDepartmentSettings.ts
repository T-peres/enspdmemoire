import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DepartmentSettings } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useDepartmentSettings(departmentId?: string) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const effectiveDepartmentId = departmentId || profile?.department_id;

  const { data: settings, isLoading } = useQuery({
    queryKey: ['department-settings', effectiveDepartmentId],
    queryFn: async () => {
      if (!effectiveDepartmentId) return null;

      const { data, error } = await supabase
        .from('department_settings')
        .select('*')
        .eq('department_id', effectiveDepartmentId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as DepartmentSettings | null;
    },
    enabled: !!effectiveDepartmentId,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<DepartmentSettings>) => {
      if (!effectiveDepartmentId) throw new Error('Department ID is required');

      // Vérifier si les paramètres existent
      const { data: existing } = await supabase
        .from('department_settings')
        .select('id')
        .eq('department_id', effectiveDepartmentId)
        .single();

      let result;
      if (existing) {
        // Mise à jour
        const { data, error } = await supabase
          .from('department_settings')
          .update({ ...updates, updated_by: user?.id })
          .eq('department_id', effectiveDepartmentId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Création
        const { data, error } = await supabase
          .from('department_settings')
          .insert([{
            department_id: effectiveDepartmentId,
            ...updates,
            created_by: user?.id,
          }])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-settings'] });
      toast.success('Paramètres mis à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const canSubmitReport = async (studentId: string) => {
    const { data, error } = await supabase.rpc('can_submit_report', {
      p_student_id: studentId,
    });

    if (error) throw error;
    return data as boolean;
  };

  return {
    settings,
    isLoading,
    updateSettings,
    canSubmitReport,
  };
}

export function useEvaluationCriteria(departmentId?: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const effectiveDepartmentId = departmentId || profile?.department_id;

  const { data: criteria, isLoading } = useQuery({
    queryKey: ['evaluation-criteria', effectiveDepartmentId],
    queryFn: async () => {
      if (!effectiveDepartmentId) return [];

      const { data, error } = await supabase
        .from('evaluation_criteria')
        .select('*')
        .eq('department_id', effectiveDepartmentId)
        .eq('is_active', true)
        .order('category')
        .order('display_order');

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveDepartmentId,
  });

  const createCriterion = useMutation({
    mutationFn: async (criterionData: Partial<any>) => {
      const { data, error } = await supabase
        .from('evaluation_criteria')
        .insert([{ ...criterionData, department_id: effectiveDepartmentId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-criteria'] });
      toast.success('Critère créé');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateCriterion = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<any> }) => {
      const { data, error } = await supabase
        .from('evaluation_criteria')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-criteria'] });
      toast.success('Critère mis à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteCriterion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('evaluation_criteria')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-criteria'] });
      toast.success('Critère supprimé');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    criteria,
    isLoading,
    createCriterion,
    updateCriterion,
    deleteCriterion,
  };
}
