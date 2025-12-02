import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FicheSuivi } from '@/types/database';
import { BarChart, CheckCircle, Clock, TrendingUp, Users } from 'lucide-react';

interface StudentProgress extends FicheSuivi {
  student?: {
    first_name: string;
    last_name: string;
    student_id: string;
  };
  theme?: {
    title: string;
  };
}

/**
 * Tableau de bord de suivi de progression pour l'encadreur
 * Vue d'ensemble de tous les étudiants encadrés avec leurs progressions
 */
export function ProgressTrackingDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    onTrack: 0,
    needsAttention: 0,
    avgProgress: 0,
  });

  useEffect(() => {
    if (user) {
      loadStudentsProgress();
    }
  }, [user]);

  const loadStudentsProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('fiche_suivi')
        .select(`
          *,
          student:profiles!fiche_suivi_student_id_fkey(first_name, last_name, student_id),
          theme:themes(title)
        `)
        .eq('supervisor_id', user?.id)
        .order('overall_progress', { ascending: false });

      if (error) throw error;

      const progressData = data || [];
      setStudents(progressData);

      // Calculer les statistiques
      const total = progressData.length;
      const onTrack = progressData.filter(s => s.overall_progress >= 70).length;
      const needsAttention = progressData.filter(s => s.overall_progress < 50).length;
      const avgProgress = total > 0
        ? progressData.reduce((sum, s) => sum + s.overall_progress, 0) / total
        : 0;

      setStats({ total, onTrack, needsAttention, avgProgress });
    } catch (error) {
      console.error('Error loading students progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressStatus = (progress: number) => {
    if (progress >= 80) return { label: 'Excellent', variant: 'default' as const };
    if (progress >= 50) return { label: 'En cours', variant: 'secondary' as const };
    return { label: 'Attention', variant: 'destructive' as const };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suivi de Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Étudiants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Sur la Bonne Voie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.onTrack}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Nécessitent Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold">{stats.needsAttention}</span>
            </div>
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
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{stats.avgProgress.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des étudiants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Progression des Étudiants
          </CardTitle>
          <CardDescription>
            Vue détaillée de la progression de chaque étudiant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucun étudiant à encadrer
            </p>
          ) : (
            <div className="space-y-4">
              {students.map((student) => {
                const status = getProgressStatus(student.overall_progress);
                return (
                  <div key={student.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">
                          {student.student?.first_name} {student.student?.last_name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {student.student?.student_id}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {student.theme?.title}
                        </p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Progression Globale</span>
                          <span className={`text-sm font-bold ${getProgressColor(student.overall_progress)}`}>
                            {student.overall_progress}%
                          </span>
                        </div>
                        <Progress value={student.overall_progress} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Plan:</span>
                          <span className={`ml-1 font-medium ${student.plan_approved ? 'text-green-600' : 'text-gray-400'}`}>
                            {student.plan_approved ? '✓' : '○'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Ch. 1:</span>
                          <span className="ml-1 font-medium">{student.chapter_1_progress}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Ch. 2:</span>
                          <span className="ml-1 font-medium">{student.chapter_2_progress}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Ch. 3:</span>
                          <span className="ml-1 font-medium">{student.chapter_3_progress}%</span>
                        </div>
                      </div>

                      {student.supervisor_validated && (
                        <div className="bg-green-50 p-2 rounded text-sm text-green-800">
                          ✓ Validé par l'encadreur
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
