import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Department } from '@/types/database';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async (): Promise<Department[]> => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDepartmentById(id: string | undefined) {
  return useQuery({
    queryKey: ['department', id],
    queryFn: async (): Promise<Department | null> => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartmentStats(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['department-stats', departmentId],
    queryFn: async () => {
      if (!departmentId) return null;

      // Récupérer les statistiques du département
      const [
        { data: students, error: studentsError },
        { data: supervisors, error: supervisorsError },
        { data: themes, error: themesError },
        { data: topics, error: topicsError }
      ] = await Promise.all([
        // Étudiants du département
        supabase
          .from('profiles')
          .select('id')
          .eq('department_id', departmentId)
          .in('id', 
            supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'student')
          ),
        
        // Encadreurs du département
        supabase
          .from('profiles')
          .select('id')
          .eq('department_id', departmentId)
          .in('id', 
            supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'supervisor')
          ),
        
        // Thèmes approuvés
        supabase
          .from('themes')
          .select('id, status')
          .in('student_id',
            supabase
              .from('profiles')
              .select('id')
              .eq('department_id', departmentId)
          ),
        
        // Sujets de thèse
        supabase
          .from('thesis_topics')
          .select('id, status')
          .eq('department_id', departmentId)
      ]);

      if (studentsError) throw studentsError;
      if (supervisorsError) throw supervisorsError;
      if (themesError) throw themesError;
      if (topicsError) throw topicsError;

      return {
        totalStudents: students?.length || 0,
        totalSupervisors: supervisors?.length || 0,
        totalThemes: themes?.length || 0,
        approvedThemes: themes?.filter(t => t.status === 'approved').length || 0,
        totalTopics: topics?.length || 0,
        approvedTopics: topics?.filter(t => t.status === 'approved').length || 0,
        pendingTopics: topics?.filter(t => t.status === 'pending').length || 0,
      };
    },
    enabled: !!departmentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}