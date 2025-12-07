import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AlertTriangle, 
  FileText, 
  Calendar, 
  Users, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Shield
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'fiche' | 'defense' | 'pv' | 'plagiarism' | 'theme' | 'supervisor';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  count?: number;
  actionLabel?: string;
  createdAt: string;
}

export function DepartmentAlertsPanel() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.department_id) {
      loadAlerts();
    }
  }, [profile]);

  const loadAlerts = async () => {
    if (!profile?.department_id) return;

    setLoading(true);
    try {
      const alertsList: Alert[] = [];

      // 1. Fiches de rencontre en attente de validation
      const { count: pendingFichesCount } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .in('student_id', 
          supabase
            .from('profiles')
            .select('id')
            .eq('department_id', profile.department_id)
        );

      if (pendingFichesCount && pendingFichesCount > 0) {
        alertsList.push({
          id: 'pending-fiches',
          type: 'fiche',
          severity: pendingFichesCount > 10 ? 'high' : 'medium',
          title: 'Fiches de rencontre à valider',
          description: `${pendingFichesCount} fiche(s) de rencontre en attente de votre validation`,
          count: pendingFichesCount,
          actionLabel: 'Voir les fiches',
          createdAt: new Date().toISOString(),
        });
      }

      // 2. Fiches de suivi en attente
      const { count: pendingFicheSuiviCount } = await supabase
        .from('fiche_suivi')
        .select('*', { count: 'exact', head: true })
        .eq('supervisor_validated', true)
        .eq('department_head_validated', false)
        .in('student_id',
          supabase
            .from('profiles')
            .select('id')
            .eq('department_id', profile.department_id)
        );

      if (pendingFicheSuiviCount && pendingFicheSuiviCount > 0) {
        alertsList.push({
          id: 'pending-fiche-suivi',
          type: 'fiche',
          severity: 'high',
          title: 'Fiches de suivi à valider',
          description: `${pendingFicheSuiviCount} fiche(s) de suivi validée(s) par l'encadreur en attente`,
          count: pendingFicheSuiviCount,
          actionLabel: 'Valider',
          createdAt: new Date().toISOString(),
        });
      }

      // 3. Sujets en attente d'approbation
      const { count: pendingThemesCount } = await supabase
        .from('thesis_topics')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', profile.department_id)
        .eq('status', 'pending');

      if (pendingThemesCount && pendingThemesCount > 0) {
        alertsList.push({
          id: 'pending-themes',
          type: 'theme',
          severity: 'medium',
          title: 'Sujets à approuver',
          description: `${pendingThemesCount} sujet(s) de mémoire en attente d'approbation`,
          count: pendingThemesCount,
          actionLabel: 'Approuver',
          createdAt: new Date().toISOString(),
        });
      }

      // 4. Soutenances à planifier
      const { data: settings } = await supabase
        .from('department_settings')
        .select('defense_start_date, defense_end_date')
        .eq('department_id', profile.department_id)
        .single();

      if (settings?.defense_start_date) {
        const daysUntilDefense = Math.floor(
          (new Date(settings.defense_start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        // Compter les étudiants sans soutenance planifiée
        const { data: studentsWithoutDefense } = await supabase
          .from('profiles')
          .select('id')
          .eq('department_id', profile.department_id)
          .not('id', 'in', 
            supabase
              .from('defense_sessions')
              .select('student_id')
          );

        const studentsCount = studentsWithoutDefense?.length || 0;

        if (daysUntilDefense <= 30 && daysUntilDefense > 0 && studentsCount > 0) {
          alertsList.push({
            id: 'defense-planning',
            type: 'defense',
            severity: daysUntilDefense <= 14 ? 'critical' : 'high',
            title: 'Soutenances à planifier',
            description: `${studentsCount} étudiant(s) sans soutenance planifiée. Période de soutenance dans ${daysUntilDefense} jours.`,
            count: studentsCount,
            actionLabel: 'Planifier',
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 5. PV à générer/valider
      const { count: pendingMinutesCount } = await supabase
        .from('defense_minutes')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', profile.department_id)
        .in('status', ['draft', 'pending_signatures']);

      if (pendingMinutesCount && pendingMinutesCount > 0) {
        alertsList.push({
          id: 'pending-minutes',
          type: 'pv',
          severity: 'medium',
          title: 'PV à finaliser',
          description: `${pendingMinutesCount} procès-verbal(aux) en attente de finalisation`,
          count: pendingMinutesCount,
          actionLabel: 'Voir les PV',
          createdAt: new Date().toISOString(),
        });
      }

      // 6. Cas de plagiat
      const { data: plagiarismCases } = await supabase
        .from('plagiarism_reports')
        .select(`
          *,
          theme:thesis_topics!plagiarism_reports_theme_id_fkey(
            student:profiles!thesis_topics_chosen_by_student_id_fkey(
              department_id
            )
          )
        `)
        .gte('plagiarism_score', settings?.plagiarism_threshold || 20);

      const departmentPlagiarismCases = plagiarismCases?.filter(
        p => p.theme?.student?.department_id === profile.department_id
      ) || [];

      if (departmentPlagiarismCases.length > 0) {
        alertsList.push({
          id: 'plagiarism-cases',
          type: 'plagiarism',
          severity: 'critical',
          title: 'Cas de plagiat détectés',
          description: `${departmentPlagiarismCases.length} cas de plagiat dépassant le seuil autorisé`,
          count: departmentPlagiarismCases.length,
          actionLabel: 'Examiner',
          createdAt: new Date().toISOString(),
        });
      }

      // 7. Encadreurs surchargés
      const { data: supervisorLoads } = await supabase
        .from('supervisor_assignments')
        .select(`
          supervisor_id,
          supervisor:profiles!supervisor_assignments_supervisor_id_fkey(
            id,
            first_name,
            last_name,
            department_id
          )
        `)
        .eq('is_active', true);

      const departmentSupervisors = supervisorLoads?.filter(
        s => s.supervisor?.department_id === profile.department_id
      ) || [];

      // Compter les étudiants par encadreur
      const supervisorCounts = departmentSupervisors.reduce((acc, s) => {
        const id = s.supervisor_id;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const maxStudents = settings?.max_students_per_supervisor || 5;
      const overloadedCount = Object.values(supervisorCounts).filter(
        count => count > maxStudents
      ).length;

      if (overloadedCount > 0) {
        alertsList.push({
          id: 'overloaded-supervisors',
          type: 'supervisor',
          severity: 'medium',
          title: 'Encadreurs surchargés',
          description: `${overloadedCount} encadreur(s) dépassent le nombre maximum d'étudiants (${maxStudents})`,
          count: overloadedCount,
          actionLabel: 'Rééquilibrer',
          createdAt: new Date().toISOString(),
        });
      }

      // 8. Fiches de rencontre manquantes (étudiants sans rencontre depuis longtemps)
      const { data: studentsWithoutRecentMeeting } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          meetings!meetings_student_id_fkey(
            meeting_date
          )
        `)
        .eq('department_id', profile.department_id);

      let studentsWithOldMeetings = 0;
      studentsWithoutRecentMeeting?.forEach(student => {
        const meetings = student.meetings || [];
        if (meetings.length === 0) {
          studentsWithOldMeetings++;
        } else {
          const lastMeeting = meetings.sort((a, b) => 
            new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()
          )[0];
          const daysSince = Math.floor(
            (Date.now() - new Date(lastMeeting.meeting_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSince > 60) {
            studentsWithOldMeetings++;
          }
        }
      });

      if (studentsWithOldMeetings > 0) {
        alertsList.push({
          id: 'missing-meetings',
          type: 'fiche',
          severity: 'medium',
          title: 'Rencontres manquantes',
          description: `${studentsWithOldMeetings} étudiant(s) sans rencontre récente (> 60 jours)`,
          count: studentsWithOldMeetings,
          createdAt: new Date().toISOString(),
        });
      }

      // Trier par sévérité
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      alertsList.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      setAlerts(alertsList);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'fiche':
        return <FileText className="h-5 w-5" />;
      case 'defense':
        return <Calendar className="h-5 w-5" />;
      case 'pv':
        return <Shield className="h-5 w-5" />;
      case 'plagiarism':
        return <AlertCircle className="h-5 w-5" />;
      case 'theme':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'supervisor':
        return <Users className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Tableau de Bord - Alertes
              {(criticalCount + highCount) > 0 && (
                <Badge variant="destructive">
                  {criticalCount + highCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Points nécessitant votre attention en tant que Chef de Département
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">Aucune alerte</p>
            <p className="text-sm text-gray-400">
              Tout est sous contrôle dans votre département
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border-2 rounded-lg ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{getIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold">{alert.title}</p>
                      {alert.count && (
                        <Badge variant="outline" className="flex-shrink-0">
                          {alert.count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mb-3">{alert.description}</p>
                    {alert.actionLabel && (
                      <Button size="sm" variant="outline" className="bg-white">
                        {alert.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
