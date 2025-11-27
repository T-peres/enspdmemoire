import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useSupervisorData() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Charger les étudiants
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['supervisor-students', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      const { data, error } = await supabase
        .from('supervisor_students_overview')
        .select('*')
        .eq('supervisor_id', profile.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  // Charger les statistiques
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['supervisor-stats', profile?.id],
    queryFn: async () => {
      if (!profile) return null;

      const { data, error } = await supabase.rpc('get_supervisor_stats', {
        p_supervisor_id: profile.id,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        return {
          totalStudents: Number(data[0].total_students) || 0,
          pendingThemes: Number(data[0].pending_themes) || 0,
          approvedThemes: Number(data[0].approved_themes) || 0,
          documentsToReview: Number(data[0].documents_to_review) || 0,
          pendingMeetings: Number(data[0].pending_meetings) || 0,
          alertsCount: Number(data[0].alerts_count) || 0,
        };
      }
      return null;
    },
    enabled: !!profile,
  });

  // Charger les rencontres pour un thème
  const loadMeetings = async (themeId: string) => {
    const { data, error } = await supabase
      .from('supervisor_meetings')
      .select('*')
      .eq('theme_id', themeId)
      .order('meeting_date', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  // Charger les documents pour un thème
  const loadDocuments = async (themeId: string) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('theme_id', themeId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  // Charger les évaluations pour un thème
  const loadEvaluations = async (themeId: string) => {
    const { data, error } = await supabase
      .from('intermediate_evaluations')
      .select('*')
      .eq('theme_id', themeId)
      .order('evaluation_date', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  // Supprimer une rencontre
  const deleteMeeting = useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase
        .from('supervisor_meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-meetings'] });
      toast.success('Fiche de rencontre supprimée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Créer une alerte
  const createAlert = useMutation({
    mutationFn: async ({
      userId,
      alertType,
      severity,
      title,
      message,
      entityType,
      entityId,
    }: {
      userId: string;
      alertType: string;
      severity: string;
      title: string;
      message: string;
      entityType?: string;
      entityId?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_alert', {
        p_user_id: userId,
        p_alert_type: alertType,
        p_severity: severity,
        p_title: title,
        p_message: message,
        p_entity_type: entityType,
        p_entity_id: entityId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-stats'] });
    },
  });

  return {
    students,
    studentsLoading,
    stats,
    statsLoading,
    loadMeetings,
    loadDocuments,
    loadEvaluations,
    deleteMeeting,
    createAlert,
  };
}
