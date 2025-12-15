import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Department } from '@/types/database';
import { toast } from '@/hooks/use-toast';

type UserRole = 'student' | 'supervisor' | 'department_head' | 'jury' | 'admin';

interface DepartmentWithStats extends Department {
  student_count?: number;
  supervisor_count?: number;
  active_thesis_count?: number;
  pending_validations?: number;
}

export function useRoleBasedDepartments() {
  const { user, profile } = useAuth();
  const [departments, setDepartments] = useState<DepartmentWithStats[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserRolesAndDepartments();
    }
  }, [user]);

  const fetchUserRolesAndDepartments = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer les rôles de l'utilisateur
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) throw rolesError;

      const roles = rolesData?.map(r => r.role as UserRole) || [];
      setUserRoles(roles);

      // 2. Récupérer les départements selon les rôles
      await fetchDepartmentsByRoles(roles);

    } catch (error: any) {
      console.error('Error fetching roles and departments:', error);
      setError(error.message);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les départements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentsByRoles = async (roles: UserRole[]) => {
    let query = supabase.from('departments').select('*');

    // Filtrage selon les rôles
    if (roles.includes('admin')) {
      // Admin : tous les départements avec statistiques complètes
      const { data, error } = await supabase.rpc('get_departments_with_full_stats');
      if (error) throw error;
      setDepartments(data || []);
      return;
    }

    if (roles.includes('department_head')) {
      // Chef de département : son département + statistiques
      if (profile?.department_id) {
        const { data, error } = await supabase.rpc('get_department_head_stats', {
          dept_id: profile.department_id
        });
        if (error) throw error;
        setDepartments(data || []);
        return;
      }
    }

    if (roles.includes('supervisor')) {
      // Encadreur : départements où il peut encadrer
      const { data, error } = await supabase.rpc('get_supervisor_departments', {
        supervisor_id: user.id
      });
      if (error) throw error;
      setDepartments(data || []);
      return;
    }

    if (roles.includes('jury')) {
      // Jury : départements selon expertise
      const { data, error } = await supabase.rpc('get_jury_eligible_departments', {
        jury_id: user.id
      });
      if (error) throw error;
      setDepartments(data || []);
      return;
    }

    if (roles.includes('student')) {
      // Étudiant : tous les départements (pour sélection)
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      if (error) throw error;
      setDepartments(data || []);
      return;
    }

    // Par défaut : départements de base
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    if (error) throw error;
    setDepartments(data || []);
  };

  const getDepartmentsByRole = (role: UserRole): DepartmentWithStats[] => {
    switch (role) {
      case 'admin':
        return departments;
      
      case 'department_head':
        return departments.filter(d => d.id === profile?.department_id);
      
      case 'supervisor':
        // Départements où l'encadreur peut superviser
        return departments.filter(d => 
          d.id === profile?.department_id || 
          d.supervisor_count !== undefined
        );
      
      case 'jury':
        // Départements selon l'expertise
        return departments;
      
      case 'student':
        return departments;
      
      default:
        return departments;
    }
  };

  const canAccessDepartment = (departmentId: string, role: UserRole): boolean => {
    switch (role) {
      case 'admin':
        return true;
      
      case 'department_head':
        return departmentId === profile?.department_id;
      
      case 'supervisor':
        return departments.some(d => d.id === departmentId);
      
      case 'jury':
        return departments.some(d => d.id === departmentId);
      
      case 'student':
        return true;
      
      default:
        return false;
    }
  };

  const refreshDepartments = () => {
    if (userRoles.length > 0) {
      fetchDepartmentsByRoles(userRoles);
    }
  };

  return {
    departments,
    userRoles,
    loading,
    error,
    getDepartmentsByRole,
    canAccessDepartment,
    refreshDepartments,
  };
}