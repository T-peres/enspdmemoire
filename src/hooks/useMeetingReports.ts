import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MeetingReport } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useMeetingReports(themeId?: string, studentId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['meeting-reports', themeId, studentId],
    queryFn: async () => {
      let query = supabase
        .from('meeting_reports')
        .select(`
          *,
          student:profiles!meeting_reports_student_id_fkey(id, first_name, last_name, email),
          supervisor:profiles!meeting_reports_supervisor_id_fkey(id, first_name, last_name, email)
        `)
        .order('meeting_date', { ascending: false });

      if (themeId) {
        query = query.eq('theme_id', themeId);
      }
      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MeetingReport[];
    },
    enabled: !!user && (!!themeId || !!studentId),
  });

  const createReport = useMutation({
    mutationFn: async (reportData: Partial<MeetingReport>) => {
      const { data, error } = await supabase
        .from('meeting_reports')
        .insert([{ ...reportData, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-reports'] });
      toast.success('Fiche de rencontre créée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MeetingReport> }) => {
      const { data, error } = await supabase
        .from('meeting_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-reports'] });
      toast.success('Fiche de rencontre mise à jour');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const submitReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase
        .from('meeting_reports')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-reports'] });
      toast.success('Fiche soumise au chef de département');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const validateReport = useMutation({
    mutationFn: async ({ reportId, approved, reason }: { reportId: string; approved: boolean; reason?: string }) => {
      const { data, error } = await supabase
        .from('meeting_reports')
        .update({
          status: approved ? 'validated' : 'rejected',
          validated_at: approved ? new Date().toISOString() : null,
          validated_by: user?.id,
          rejection_reason: reason,
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-reports'] });
      toast.success(variables.approved ? 'Fiche validée' : 'Fiche rejetée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    reports,
    isLoading,
    createReport,
    updateReport,
    submitReport,
    validateReport,
  };
}
