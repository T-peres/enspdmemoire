import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupervisorAssignmentForm } from '@/components/department/SupervisorAssignmentForm';
import { SupervisorsList } from '@/components/department/SupervisorsList';
import { FicheSuiviValidation } from '@/components/department/FicheSuiviValidation';
import { DepartmentHeadStats } from '@/components/department/DepartmentHeadStats';
import { DefenseScheduler } from '@/components/department/DefenseScheduler';
import { useSupervisorAssignments } from '@/hooks/useSupervisorAssignments';
import { supabase } from '@/integrations/supabase/client';
import { StudentProgress } from '@/types/database';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function DepartmentHeadDashboard() {
  const { profile } = useAuth();
  const { assignments, isLoading: assignmentsLoading } = useSupervisorAssignments();
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    studentsWithSupervisor: 0,
    pendingThemes: 0,
    approvedThemes: 0,
    pendingMeetings: 0,
    pendingDefenses: 0,
    completedDefenses: 0,
    avgProgress: 0,
  });

  useEffect(() => {
    loadDepartmentData();
  }, [profile?.department_id]);

  useEffect(() => {
    if (profile?.department_id) {
      loadDepartmentStats();
    }
  }, [profile?.department_id]);

  const loadDepartmentData = async () => {
    if (!profile?.department_id) {
      setLoading(false);
      return;
    }

    try {
      // Charger les informations du département
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('id', profile.department_id)
        .single();

      if (deptError) throw deptError;
      setDepartment(deptData);

      // Charger la progression des étudiants du département
      // CORRECTION CRITIQUE: Filtrer par department_id pour éviter la fuite de données
      const { data: progressData, error: progressError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          department_id,
          student_id,
          themes:thesis_topics!chosen_by_student_id(
            id,
            title,
            status
          ),
          supervisor_assignment:supervisor_assignments!student_id(
            supervisor:profiles!supervisor_id(
              id,
              first_name,
              last_name
            )
          )
        `)
        .eq('department_id', profile.department_id)
        .order('last_name');

      if (progressError) throw progressError;
      
      // Transformer les données pour correspondre au format StudentProgress
      const departmentStudents = progressData?.map(student => ({
        student_id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        theme_id: student.themes?.[0]?.id || null,
        theme_title: student.themes?.[0]?.title || null,
        theme_status: student.themes?.[0]?.status || null,
        supervisor_id: student.supervisor_assignment?.[0]?.supervisor?.id || null,
        supervisor_first_name: student.supervisor_assignment?.[0]?.supervisor?.first_name || null,
        supervisor_last_name: student.supervisor_assignment?.[0]?.supervisor?.last_name || null,
        overall_progress: 0, // À calculer depuis fiche_suivi si nécessaire
        supervisor_validated: false,
        department_head_validated: false
      })) || [];
      
      setStudentProgress(departmentStudents);
    } catch (error) {
      console.error('Error loading department data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentStats = async () => {
    if (!profile?.department_id) return;

    try {
      const { data, error } = await supabase.rpc('get_department_stats', {
        p_department_id: profile.department_id,
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setStats({
          totalStudents: Number(data[0].total_students) || 0,
          studentsWithSupervisor: Number(data[0].students_with_supervisor) || 0,
          pendingThemes: Number(data[0].pending_themes) || 0,
          approvedThemes: Number(data[0].approved_themes) || 0,
          pendingMeetings: Number(data[0].pending_meetings) || 0,
          pendingDefenses: Number(data[0].pending_defenses) || 0,
          completedDefenses: Number(data[0].completed_defenses) || 0,
          avgProgress: Number(data[0].avg_progress) || 0,
        });
      }
    } catch (error: any) {
      console.error('Error loading department stats:', error);
    }
  };

  const studentsWithSupervisor = assignments?.length || 0;
  const studentsWithApprovedTheme = studentProgress.filter(s => s.theme_status === 'approved').length;
  const studentsWithValidatedProgress = studentProgress.filter(s => s.supervisor_validated).length;

  // Couleurs par département
  const getDepartmentColor = (code: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      'GIT': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      'GESI': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      'GQHSE': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      'GAM': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      'GMP': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
      'GP': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      'GE': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
      'GM': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'GPH': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
      'GC': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    };
    return colors[code] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  };

  const deptColors = department ? getDepartmentColor(department.code) : { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };

  if (loading || assignmentsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Bandeau personnalisé du département */}
      {department && (
        <div className={`${deptColors.bg} ${deptColors.border} border-b-4`}>
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <div className={`${deptColors.text} p-3 rounded-lg bg-white/50`}>
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${deptColors.text}`}>
                  {department.name}
                </h2>
                <p className="text-sm text-gray-600">
                  Code: {department.code} • Chef de Département: {profile?.first_name} {profile?.last_name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Tableau de bord Chef de Département
          </h1>
          <p className="text-muted-foreground">
            Gestion des étudiants et encadreurs du département {department?.code}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8">
          <DepartmentHeadStats stats={stats} />
        </div>

        <Tabs defaultValue="assignments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="assignments">Attributions</TabsTrigger>
            <TabsTrigger value="supervisors">Encadreurs</TabsTrigger>
            <TabsTrigger value="progress">Suivi Global</TabsTrigger>
            <TabsTrigger value="validation">Validations</TabsTrigger>
            <TabsTrigger value="defenses">Soutenances</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <SupervisorAssignmentForm />
              
              <Card>
                <CardHeader>
                  <CardTitle>Attributions Récentes</CardTitle>
                  <CardDescription>Liste des dernières attributions d'encadreurs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {assignments?.slice(0, 5).map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">
                            {assignment.student?.first_name} {assignment.student?.last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Encadreur: {assignment.supervisor?.first_name} {assignment.supervisor?.last_name}
                          </p>
                        </div>
                        <Badge className="bg-green-500">Actif</Badge>
                      </div>
                    ))}
                    {(!assignments || assignments.length === 0) && (
                      <p className="text-center text-gray-500 py-4">
                        Aucune attribution récente
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="supervisors" className="space-y-4">
            <SupervisorsList />
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Progression des Étudiants</CardTitle>
                <CardDescription>Vue d'ensemble de l'avancement de tous les étudiants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentProgress.map((student) => (
                    <div key={student.student_id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{student.email}</p>
                        </div>
                        <div className="text-right">
                          {student.theme_status && (
                            <Badge variant={student.theme_status === 'approved' ? 'default' : 'secondary'}>
                              {student.theme_status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {student.theme_title && (
                        <p className="text-sm mb-2">
                          <span className="font-medium">Thème:</span> {student.theme_title}
                        </p>
                      )}
                      
                      {student.supervisor_first_name && (
                        <p className="text-sm mb-2">
                          <span className="font-medium">Encadreur:</span> {student.supervisor_first_name} {student.supervisor_last_name}
                        </p>
                      )}
                      
                      {student.overall_progress !== undefined && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Progression</span>
                            <span className="text-sm text-gray-600">{student.overall_progress}%</span>
                          </div>
                          <Progress value={student.overall_progress} className="h-2" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <FicheSuiviValidation />
          </TabsContent>

          <TabsContent value="defenses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Soutenances</CardTitle>
                <CardDescription>
                  Planifier et gérer les soutenances du département
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Sélectionnez un étudiant dans l'onglet "Suivi Global" pour planifier sa soutenance.
                </p>
                {/* Le composant DefenseScheduler sera utilisé quand un étudiant est sélectionné */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
