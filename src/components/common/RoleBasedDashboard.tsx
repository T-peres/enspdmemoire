import { useAuth } from '@/contexts/AuthContext';
import { useRoleBasedDepartments } from '@/hooks/useRoleBasedDepartments';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { SupervisorDashboard } from '@/pages/SupervisorDashboard';
import { JuryDashboard } from '@/pages/JuryDashboard';
import { DepartmentHeadDashboard } from '@/pages/DepartmentHeadDashboard';
import { Admin } from '@/pages/Admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GraduationCap, 
  User, 
  Users, 
  Shield, 
  Settings,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'student' | 'supervisor' | 'department_head' | 'jury' | 'admin';

interface RoleInfo {
  role: UserRole;
  label: string;
  icon: any;
  description: string;
  color: string;
}

const ROLE_INFO: Record<UserRole, RoleInfo> = {
  student: {
    role: 'student',
    label: 'Étudiant',
    icon: GraduationCap,
    description: 'Gérer mon mémoire, rencontres et documents',
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  supervisor: {
    role: 'supervisor',
    label: 'Encadreur',
    icon: User,
    description: 'Superviser les étudiants et valider les travaux',
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  jury: {
    role: 'jury',
    label: 'Jury',
    icon: Users,
    description: 'Évaluer et valider les mémoires',
    color: 'bg-purple-50 border-purple-200 text-purple-800'
  },
  department_head: {
    role: 'department_head',
    label: 'Chef de Département',
    icon: Shield,
    description: 'Superviser le département et affecter les jurys',
    color: 'bg-orange-50 border-orange-200 text-orange-800'
  },
  admin: {
    role: 'admin',
    label: 'Administrateur',
    icon: Settings,
    description: 'Administration complète du système',
    color: 'bg-red-50 border-red-200 text-red-800'
  }
};

export function RoleBasedDashboard() {
  const { user, profile } = useAuth();
  const { userRoles, loading } = useRoleBasedDepartments();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [roleStats, setRoleStats] = useState<Record<UserRole, any>>({});

  useEffect(() => {
    if (userRoles.length > 0 && !selectedRole) {
      // Sélectionner automatiquement le premier rôle
      setSelectedRole(userRoles[0]);
    }
  }, [userRoles, selectedRole]);

  useEffect(() => {
    if (userRoles.length > 0) {
      fetchRoleStats();
    }
  }, [userRoles]);

  const fetchRoleStats = async () => {
    if (!user) return;

    const stats: Record<UserRole, any> = {};

    for (const role of userRoles) {
      try {
        const { data, error } = await supabase.rpc(`get_${role}_stats`, {
          user_id: user.id
        });

        if (!error && data) {
          stats[role] = data;
        }
      } catch (error) {
        console.error(`Error fetching ${role} stats:`, error);
        stats[role] = {};
      }
    }

    setRoleStats(stats);
  };

  const renderDashboardForRole = (role: UserRole) => {
    switch (role) {
      case 'student':
        return <StudentDashboard />;
      case 'supervisor':
        return <SupervisorDashboard />;
      case 'jury':
        return <JuryDashboard />;
      case 'department_head':
        return <DepartmentHeadDashboard />;
      case 'admin':
        return <Admin />;
      default:
        return (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Rôle non reconnu</h3>
              <p className="text-muted-foreground">
                Ce rôle n'est pas encore configuré dans le système.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  const getRoleStats = (role: UserRole) => {
    const stats = roleStats[role] || {};
    
    switch (role) {
      case 'student':
        return {
          primary: stats.documents_submitted || 0,
          primaryLabel: 'Documents soumis',
          secondary: stats.meetings_completed || 0,
          secondaryLabel: 'Rencontres'
        };
      case 'supervisor':
        return {
          primary: stats.students_count || 0,
          primaryLabel: 'Étudiants',
          secondary: stats.pending_validations || 0,
          secondaryLabel: 'Validations'
        };
      case 'jury':
        return {
          primary: stats.assigned_thesis || 0,
          primaryLabel: 'Mémoires assignés',
          secondary: stats.pending_evaluations || 0,
          secondaryLabel: 'À évaluer'
        };
      case 'department_head':
        return {
          primary: stats.total_students || 0,
          primaryLabel: 'Étudiants',
          secondary: stats.pending_assignments || 0,
          secondaryLabel: 'Affectations'
        };
      case 'admin':
        return {
          primary: stats.total_users || 0,
          primaryLabel: 'Utilisateurs',
          secondary: stats.system_alerts || 0,
          secondaryLabel: 'Alertes'
        };
      default:
        return {
          primary: 0,
          primaryLabel: 'N/A',
          secondary: 0,
          secondaryLabel: 'N/A'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRoles.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucun rôle assigné</h3>
          <p className="text-muted-foreground">
            Contactez l'administrateur pour obtenir les permissions appropriées.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Si un seul rôle, afficher directement le dashboard
  if (userRoles.length === 1) {
    return renderDashboardForRole(userRoles[0]);
  }

  // Plusieurs rôles : interface de sélection
  return (
    <div className="space-y-6">
      {/* Sélecteur de rôles */}
      <Card>
        <CardHeader>
          <CardTitle>Sélectionnez votre espace de travail</CardTitle>
          <CardDescription>
            Vous avez plusieurs rôles. Choisissez l'espace que vous souhaitez utiliser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userRoles.map((role) => {
              const roleInfo = ROLE_INFO[role];
              const stats = getRoleStats(role);
              const Icon = roleInfo.icon;
              
              return (
                <Card 
                  key={role}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedRole === role ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedRole(role)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${roleInfo.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2">{roleInfo.label}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {roleInfo.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-center">
                        <div className="font-bold text-lg">{stats.primary}</div>
                        <div className="text-muted-foreground">{stats.primaryLabel}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg">{stats.secondary}</div>
                        <div className="text-muted-foreground">{stats.secondaryLabel}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dashboard du rôle sélectionné */}
      {selectedRole && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${ROLE_INFO[selectedRole].color}`}>
              {(() => {
                const Icon = ROLE_INFO[selectedRole].icon;
                return <Icon className="h-5 w-5" />;
              })()}
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                Espace {ROLE_INFO[selectedRole].label}
              </h2>
              <p className="text-sm text-muted-foreground">
                {ROLE_INFO[selectedRole].description}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRole(null)}
              className="ml-auto"
            >
              Changer de rôle
            </Button>
          </div>
          
          {renderDashboardForRole(selectedRole)}
        </div>
      )}
    </div>
  );
}