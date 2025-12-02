import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, TrendingUp, Users, FileText, CheckCircle, Clock } from 'lucide-react';

interface DepartmentStats {
  totalStudents: number;
  totalSupervisors: number;
  totalThemes: number;
  approvedThemes: number;
  pendingThemes: number;
  completedTheses: number;
  avgProgress: number;
  studentsWithSupervisor: number;
  studentsWithoutSupervisor: number;
}

/**
 * Statistiques du département
 * Vue d'ensemble des métriques clés pour le chef de département
 */
export function DepartmentStatistics() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DepartmentStats>({
    totalStudents: 0,
    totalSupervisors: 0,
    totalThemes: 0,
    approvedThemes: 0,
    pendingThemes: 0,
    completedTheses: 0,
    avgProgress: 0,
    studentsWithSupervisor: 0,
    studentsWithoutSupervisor: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.department_id) {
      loadStatistics();
    }
  }, [profile]);

  const loadStatistics = async () => {
    try {
      const departmentId = profile?.department_id;

      // Compter les étudiants
      const { data: studentRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      const studentIds = studentRoles?.map(r => r.user_id) || [];
      
      const { count: totalStudents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('id', studentIds)
        .eq('department_id', departmentId);

      // Compter les encadreurs
      const { data: supervisorRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'supervisor');

      const supervisorIds = supervisorRoles?.map(r => r.user_id) || [];
      
      const { count: totalSupervisors } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('id', supervisorIds)
        .eq('department_id', departmentId);

      // Statistiques des thèmes
      const { data: themes } = await supabase
        .from('themes')
        .select('status')
        .in('student_id', studentIds);

      const totalThemes = themes?.length || 0;
      const approvedThemes = themes?.filter(t => t.status === 'approved').length || 0;
      const pendingThemes = themes?.filter(t => t.status === 'pending').length || 0;

      // Étudiants avec/sans encadreur
      const { data: assignments } = await supabase
        .from('supervisor_assignments')
        .select('student_id')
        .eq('is_active', true)
        .in('student_id', studentIds);

      const studentsWithSupervisor = new Set(assignments?.map(a => a.student_id)).size;
      const studentsWithoutSupervisor = (totalStudents || 0) - studentsWithSupervisor;

      // Progression moyenne
      const { data: ficheSuivi } = await supabase
        .from('fiche_suivi')
        .select('overall_progress')
        .in('student_id', studentIds);

      const avgProgress = ficheSuivi && ficheSuivi.length > 0
        ? ficheSuivi.reduce((sum, f) => sum + f.overall_progress, 0) / ficheSuivi.length
        : 0;

      // Mémoires terminés (progression >= 100%)
      const completedTheses = ficheSuivi?.filter(f => f.overall_progress >= 100).length || 0;

      setStats({
        totalStudents: totalStudents || 0,
        totalSupervisors: totalSupervisors || 0,
        totalThemes,
        approvedThemes,
        pendingThemes,
        completedTheses,
        avgProgress,
        studentsWithSupervisor,
        studentsWithoutSupervisor,
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Statistiques du Département</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques du Département
          </CardTitle>
          <CardDescription>
            Vue d'ensemble des activités et de la progression
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Étudiants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-3xl font-bold">{stats.totalStudents}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.studentsWithSupervisor} avec encadreur
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Encadreurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <span className="text-3xl font-bold">{stats.totalSupervisors}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Actifs dans le département
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Thèmes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <span className="text-3xl font-bold">{stats.totalThemes}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.approvedThemes} approuvés, {stats.pendingThemes} en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Progression Moyenne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <span className="text-3xl font-bold">{stats.avgProgress.toFixed(0)}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.completedTheses} mémoires terminés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Détails supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attribution des Encadreurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avec encadreur</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${stats.totalStudents > 0 ? (stats.studentsWithSupervisor / stats.totalStudents) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{stats.studentsWithSupervisor}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Sans encadreur</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full"
                      style={{
                        width: `${stats.totalStudents > 0 ? (stats.studentsWithoutSupervisor / stats.totalStudents) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{stats.studentsWithoutSupervisor}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statut des Thèmes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Approuvés</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold">{stats.approvedThemes}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">En attente</span>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-semibold">{stats.pendingThemes}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold">{stats.totalThemes}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
