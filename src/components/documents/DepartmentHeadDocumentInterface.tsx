import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp, 
  Download,
  Eye,
  Calendar,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

interface DepartmentHeadDocumentInterfaceProps {
  themeId?: string;
  studentId?: string;
  onDocumentAction?: () => void;
}

interface DepartmentStats {
  total_students: number;
  total_supervisors: number;
  total_documents: number;
  pending_documents: number;
  approved_documents: number;
  rejected_documents: number;
  completion_rate: number;
}

interface StudentProgress {
  student_id: string;
  student_name: string;
  theme_title: string;
  supervisor_name: string;
  overall_progress: number;
  documents_submitted: number;
  documents_approved: number;
  last_submission: string;
}

interface SupervisorStats {
  supervisor_id: string;
  supervisor_name: string;
  total_students: number;
  pending_reviews: number;
  avg_review_time: number;
  approval_rate: number;
}

export function DepartmentHeadDocumentInterface({ onDocumentAction }: DepartmentHeadDocumentInterfaceProps) {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DepartmentStats | null>(null);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [supervisorStats, setSupervisorStats] = useState<SupervisorStats[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDepartmentData();
  }, [selectedPeriod]);

  const loadDepartmentData = async () => {
    if (!profile?.department_id) return;

    try {
      // Charger les statistiques du département
      const { data: statsData, error: statsError } = await supabase.rpc('get_department_stats', {
        p_department_id: profile.department_id
      });

      if (statsError) throw statsError;
      setStats(statsData);

      // Charger le progrès des étudiants
      const { data: progressData, error: progressError } = await supabase
        .from('student_document_status')
        .select(`
          student_id,
          overall_progress,
          theme_title,
          supervisor_name,
          student:profiles!student_document_status_student_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('profiles.department_id', profile.department_id);

      if (progressError) throw progressError;

      const formattedProgress = (progressData || []).map(item => ({
        student_id: item.student_id,
        student_name: `${item.student?.first_name} ${item.student?.last_name}`,
        theme_title: item.theme_title,
        supervisor_name: item.supervisor_name,
        overall_progress: item.overall_progress,
        documents_submitted: 0, // À calculer
        documents_approved: 0, // À calculer
        last_submission: new Date().toISOString()
      }));

      setStudentProgress(formattedProgress);

      // Charger les statistiques des superviseurs
      const { data: supervisorsData, error: supervisorsError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          supervisor_assignments(count)
        `)
        .eq('department_id', profile.department_id)
        .eq('role', 'supervisor');

      if (supervisorsError) throw supervisorsError;

      const formattedSupervisors = (supervisorsData || []).map(supervisor => ({
        supervisor_id: supervisor.id,
        supervisor_name: `${supervisor.first_name} ${supervisor.last_name}`,
        total_students: supervisor.supervisor_assignments?.length || 0,
        pending_reviews: 0, // À calculer
        avg_review_time: 0, // À calculer
        approval_rate: 0 // À calculer
      }));

      setSupervisorStats(formattedSupervisors);

    } catch (error) {
      console.error('Error loading department data:', error);
      toast.error('Erreur lors du chargement des données du département');
    } finally {
      setLoading(false);
    }
  };

  const exportDepartmentReport = async () => {
    try {
      // Générer un rapport CSV
      const csvContent = [
        ['Étudiant', 'Sujet', 'Encadreur', 'Progrès', 'Documents soumis', 'Documents approuvés'],
        ...studentProgress.map(student => [
          student.student_name,
          student.theme_title,
          student.supervisor_name,
          `${student.overall_progress}%`,
          student.documents_submitted.toString(),
          student.documents_approved.toString()
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_departement_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Rapport exporté avec succès');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Erreur lors de l\'exportation du rapport');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tableau de Bord Département</h2>
          <p className="text-muted-foreground">
            Vue d'ensemble des documents et progrès des étudiants
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Année en cours</SelectItem>
              <SelectItem value="last_month">Dernier mois</SelectItem>
              <SelectItem value="last_quarter">Dernier trimestre</SelectItem>
              <SelectItem value="all_time">Toutes périodes</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportDepartmentReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Statistiques globales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_students}</p>
                  <p className="text-sm text-muted-foreground">Étudiants</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_documents}</p>
                  <p className="text-sm text-muted-foreground">Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending_documents}</p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{Math.round(stats.completion_rate)}%</p>
                  <p className="text-sm text-muted-foreground">Taux de réussite</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="students">Étudiants</TabsTrigger>
          <TabsTrigger value="supervisors">Encadreurs</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Répartition des Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Approuvés</span>
                      <Badge className="bg-green-600">{stats.approved_documents}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">En attente</span>
                      <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                        {stats.pending_documents}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rejetés</span>
                      <Badge variant="destructive">{stats.rejected_documents}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progrès Moyen par Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Plans détaillés</span>
                      <span>85%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Chapitres 1-2</span>
                      <span>65%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Chapitres 3-4</span>
                      <span>40%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Versions finales</span>
                      <span>20%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '20%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progrès des Étudiants</CardTitle>
              <CardDescription>
                Suivi détaillé du progrès de chaque étudiant
              </CardDescription>
            </CardHeader>
            <CardContent>
              {studentProgress.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun étudiant trouvé dans le département
                </div>
              ) : (
                <div className="space-y-4">
                  {studentProgress.map((student) => (
                    <div key={student.student_id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{student.student_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {student.theme_title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Encadreur : {student.supervisor_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{student.overall_progress}%</p>
                          <p className="text-sm text-muted-foreground">Progrès</p>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${student.overall_progress}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{student.documents_submitted} documents soumis</span>
                        <span>{student.documents_approved} approuvés</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supervisors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance des Encadreurs</CardTitle>
              <CardDescription>
                Statistiques et performance des encadreurs du département
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supervisorStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun encadreur trouvé dans le département
                </div>
              ) : (
                <div className="space-y-4">
                  {supervisorStats.map((supervisor) => (
                    <div key={supervisor.supervisor_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{supervisor.supervisor_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {supervisor.total_students} étudiants encadrés
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-lg font-bold">{supervisor.pending_reviews}</p>
                            <p className="text-xs text-muted-foreground">En attente</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold">{supervisor.avg_review_time}j</p>
                            <p className="text-xs text-muted-foreground">Temps moyen</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold">{supervisor.approval_rate}%</p>
                            <p className="text-xs text-muted-foreground">Taux d'approbation</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analyses et Tendances
              </CardTitle>
              <CardDescription>
                Analyses détaillées des performances du département
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Tendances Mensuelles</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Documents soumis ce mois</span>
                      <span className="font-medium">+15%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Temps de révision moyen</span>
                      <span className="font-medium">-2 jours</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Taux d'approbation</span>
                      <span className="font-medium">+5%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Alertes et Recommandations</h4>
                  <div className="space-y-2">
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      3 étudiants avec retard sur leur planning
                    </div>
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      Pic de soumissions prévu la semaine prochaine
                    </div>
                    <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                      Excellent taux de réussite ce trimestre
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}