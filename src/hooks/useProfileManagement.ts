import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, Department, AppRole } from '@/types/database';
import { toast } from 'sonner';

export interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department_id?: string;
  student_id?: string;
  roles: AppRole[];
}

export function useProfileManagement() {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const createProfile = async (formData: ProfileFormData) => {
    setLoading(true);
    try {
      // 1. Créer le profil utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          department_id: formData.department_id,
          student_id: formData.student_id,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // 2. Assigner les rôles
      if (formData.roles.length > 0) {
        const roleInserts = formData.roles.map(role => ({
          user_id: profile.id,
          role: role,
        }));

        const { error: rolesError } = await supabase
          .from('user_roles')
          .insert(roleInserts);

        if (rolesError) throw rolesError;
      }

      // 3. Créer une notification de bienvenue
      await supabase.rpc('create_notification', {
        p_user_id: profile.id,
        p_title: 'Bienvenue sur la plateforme ENSPD',
        p_message: `Votre profil a été créé avec succès. Rôles assignés: ${formData.roles.join(', ')}`,
        p_type: 'info'
      });

      toast.success('Profil créé avec succès');
      return { success: true, profile };
    } catch (error: any) {
      toast.error(`Erreur lors de la création: ${error.message}`);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (userId: string, formData: Partial<ProfileFormData>) => {
    setLoading(true);
    try {
      // 1. Mettre à jour le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          department_id: formData.department_id,
          student_id: formData.student_id,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 2. Mettre à jour les rôles si fournis
      if (formData.roles) {
        // Supprimer les anciens rôles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        // Ajouter les nouveaux rôles
        if (formData.roles.length > 0) {
          const roleInserts = formData.roles.map(role => ({
            user_id: userId,
            role: role,
          }));

          const { error: rolesError } = await supabase
            .from('user_roles')
            .insert(roleInserts);

          if (rolesError) throw rolesError;
        }
      }

      toast.success('Profil mis à jour avec succès');
      return { success: true };
    } catch (error: any) {
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const validateProfileData = (formData: ProfileFormData): string[] => {
    const errors: string[] = [];

    if (!formData.first_name.trim()) {
      errors.push('Le prénom est requis');
    }
    if (!formData.last_name.trim()) {
      errors.push('Le nom est requis');
    }
    if (!formData.email.trim()) {
      errors.push('L\'email est requis');
    }
    if (formData.roles.length === 0) {
      errors.push('Au moins un rôle doit être assigné');
    }
    if (formData.roles.includes('student') && !formData.student_id) {
      errors.push('L\'ID étudiant est requis pour le rôle étudiant');
    }
    if (!formData.department_id && formData.roles.some(r => ['student', 'supervisor', 'department_head'].includes(r))) {
      errors.push('Le département est requis pour ce rôle');
    }

    return errors;
  };

  return {
    loading,
    departments,
    createProfile,
    updateProfile,
    validateProfileData,
    fetchDepartments,
  };
}