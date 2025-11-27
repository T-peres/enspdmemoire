import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SupervisorAssignment } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useSupervisorAssignments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['supervisor-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supervisor_assignments')
        .select(`
          *,
          student:profiles!supervisor_assignments_student_id_fkey(id, first_name, last_name, email, student_id, department_id),
          supervisor:profiles!supervisor_assignments_supervisor_id_fkey(id, first_name, last_name, email)
        `)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data as SupervisorAssignment[];
    },
    enabled: !!user,
  });

  const assignSupervisor = useMutation({
    mutationFn: async ({
      studentId,
      supervisorId,
      notes,
    }: {
      studentId: string;
      supervisorId: string;
      notes?: string;
    }) => {
      // Désactiver les anciennes attributions
      await supabase
        .from('supervisor_assignments')
        .update({ is_active: false })
        .eq('student_id', studentId)
        .eq('is_active', true);

      // Créer la nouvelle attribution
      const { data, error } = await supabase
        .from('supervisor_assignments')
        .insert([{
          student_id: studentId,
          supervisor_id: supervisorId,
          assigned_by: user!.id,
          notes,
        }])
        .select()
        .single();

      if (error) throw error;

      // Notifier l'étudiant et l'encadreur
      await supabase.rpc('create_notification', {
        p_user_id: studentId,
        p_title: 'Encadreur attribué',
        p_message: 'Un encadreur vous a été attribué pour votre mémoire',
        p_type: 'info',
        p_entity_type: 'supervisor_assignment',
        p_entity_id: data.id,
      });

      await supabase.rpc('create_notification', {
        p_user_id: supervisorId,
        p_title: 'Nouvel étudiant attribué',
        p_message: 'Un nouvel étudiant vous a été attribué pour encadrement',
        p_type: 'info',
        p_entity_type: 'supervisor_assignment',
        p_entity_id: data.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-assignments'] });
      toast.success('Encadreur attribué avec succès');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    assignments,
    isLoading,
    assignSupervisor,
  };
}

export function useMyAssignment() {
  const { user } = useAuth();

  const { data: assignment, isLoading } = useQuery({
    queryKey: ['my-assignment', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supervisor_assignments')
        .select(`
          *,
          supervisor:profiles!supervisor_assignments_supervisor_id_fkey(id, first_name, last_name, email, phone)
        `)
        .eq('student_id', user?.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as SupervisorAssignment | null;
    },
    enabled: !!user,
  });

  return {
    assignment,
    isLoading,
  };
}
