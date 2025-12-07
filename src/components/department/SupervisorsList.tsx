import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SupervisorDetailsDialog } from './SupervisorDetailsDialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserCheck, UserX, Users } from 'lucide-react';

interface SupervisorWithStats {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department_id: string;
  assigned_students_count: number;
  active_themes_count: number;
  is_available: boolean;
}

export function SupervisorsList() {
  const [supervisors, setSupervisors] = useState<SupervisorWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSupervisors();
  }, []);

  const loadSupervisors = async () => {
    setLoading(true);
    try {
      // 1. Récupérer tous les encadreurs
      const { data: supervisorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'supervisor');

      if (rolesError) throw rolesError;

      if (!supervisorRoles || supervisorRoles.length === 0) {
        setSupervisors([]);
        return;
      }

      const supervisorIds = supervisorRoles.map(r => r.user_id);

      // 2. Récupérer les profils des encadreurs
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', supervisorIds)
        .order('last_name');

      if (profilesError) throw profilesError;

      // 3. Pour chaque encadreur, compter les étudiants assignés
      const supervisorsWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Compter les attributions actives
          const { count: assignedCount } = await supabase
            .from('supervisor_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('supervisor_id', profile.id)
            .eq('is_active', true);

          // Compter les thèmes actifs (approuvés)
          const { count: themesCount } = await supabase
            .from('themes')
            .select('*', { count: 'exact', head: true })
            .eq('supervisor_id', profile.id)
            .eq('status', 'approved');

          return {
            ...profile,
            assigned_students_count: assignedCount || 0,
            active_themes_count: themesCount || 0,
            is_available: (assignedCount || 0) < 5, // Max 5 étudiants par encadreur
          };
        })
      );

      setSupervisors(supervisorsWithStats);
    } catch (error) {
      console.error('Error loading supervisors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const availableSupervisors = (supervisors || []).filter(s => s.is_available).length;
  const busySupervisors = (supervisors || []).filter(s => !s.is_available).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Liste des Encadreurs</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Liste des Encadreurs</CardTitle>
            <CardDescription>
              {supervisors.length} encadreur(s) • {availableSupervisors} disponible(s) • {busySupervisors} occupé(s)
            </CardDescription>
          </div>
          <Users className="h-5 w-5 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent>
        {supervisors.length === 0 ? (
          <div className="text-center py-8">
            <UserX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">Aucun encadreur trouvé</p>
            <p className="text-sm text-gray-400">
              Créez des utilisateurs avec le rôle "supervisor" dans Supabase
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(supervisors || []).map((supervisor) => (
              <div
                key={supervisor.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {getInitials(supervisor.first_name, supervisor.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <p className="font-medium">
                      {supervisor.first_name} {supervisor.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{supervisor.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <p className="text-sm font-medium text-gray-700">
                      {supervisor.assigned_students_count} étudiant(s)
                    </p>
                    <p className="text-xs text-gray-500">
                      {supervisor.active_themes_count} thème(s) actif(s)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {supervisor.is_available ? (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Disponible
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        <Users className="h-3 w-3 mr-1" />
                        Occupé
                      </Badge>
                    )}

                    {supervisor.assigned_students_count > 0 && (
                      <SupervisorDetailsDialog
                        supervisorId={supervisor.id}
                        supervisorName={`${supervisor.first_name} ${supervisor.last_name}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Légende */}
        {supervisors.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-gray-500 mb-2 font-medium">Légende :</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Disponible (moins de 5 étudiants)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                <span>Occupé (5 étudiants ou plus)</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
