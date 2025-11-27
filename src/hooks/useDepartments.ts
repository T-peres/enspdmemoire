import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Department } from '@/types/database';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Department[];
    },
  });
}

export function useDepartment(departmentId: string) {
  return useQuery({
    queryKey: ['department', departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single();

      if (error) throw error;
      return data as Department;
    },
    enabled: !!departmentId,
  });
}

// Liste des départements de l'ENSPD
export const ENSPD_DEPARTMENTS = [
  {
    code: 'GIT',
    name: 'Génie Informatique & Télécommunications',
    description: 'Formation en informatique, réseaux et télécommunications',
  },
  {
    code: 'GESI',
    name: 'Génie Électrique et Systèmes Intelligents',
    description: 'Formation en électricité, électronique et systèmes intelligents',
  },
  {
    code: 'GQHSE',
    name: 'Génie de la Qualité Hygiène Sécurité et Environnement',
    description: 'Formation en qualité, hygiène, sécurité et environnement',
  },
  {
    code: 'GAM',
    name: 'Génie Automobile et Mécatronique',
    description: 'Formation en automobile et mécatronique',
  },
  {
    code: 'GMP',
    name: 'Génie Maritime et Portuaire',
    description: 'Formation en ingénierie maritime et portuaire',
  },
  {
    code: 'GP',
    name: 'Génie des Procédés',
    description: 'Formation en génie des procédés industriels',
  },
  {
    code: 'GE',
    name: 'Génie Énergétique',
    description: 'Formation en énergies et systèmes énergétiques',
  },
  {
    code: 'GM',
    name: 'Génie Mécanique',
    description: 'Formation en mécanique et conception',
  },
  {
    code: 'GPH',
    name: 'Génie Physique',
    description: 'Formation en physique appliquée',
  },
  {
    code: 'GC',
    name: 'Génie Civil',
    description: 'Formation en génie civil et construction',
  },
] as const;
