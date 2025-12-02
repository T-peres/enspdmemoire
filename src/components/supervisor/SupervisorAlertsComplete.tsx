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
  Clock, 
  MessageSquare, 
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Alert {
  id: string;
  type: 'meeting' | 'document' | 'fiche' | 'evaluation' | 'message';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  studentId: string;
  studentName: string;
  actionUrl?: string;
  createdAt: string;
}

export function SupervisorAlertsComplete() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'critical'>('all');

  useEffect(() => {
    if (profile) {
      loadAlerts();
    }
  }, [profile]);

  const loadAlerts = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const alertsList: Alert[] = [];

      // 1. Récupérer les étudiants encadrés
      const { data: assignments } = await supabase
        .from('supervisor_assignments')
        .select(`
          student_id,
          student:profiles!supervisor_assignments_student_id_fkey(
            id,
            first_name,
            last_name
          )
        `)
        .eq('supervisor_id', profile.id)
        .eq('is_active', true);

      if (!assignments) return;

      for (const assignment of assignments) {
        const studentName = `${assignment.student.first_name} ${assignment.student.last_name}`;
        const studentId = assignment.student_id;

        // 2. Vérifier les fiches de rencontre manquantes
        const { data: lastMeeting } = await supabase
          .from('meeting_reports')
          .select('meeting_date')
          .eq('student_id', studentId)
          .eq('supervisor_id', profile.id)
          .order('meeting_date', { ascending: false })
          .limit(1)
          .single();

        const daysSinceLastMeeting = lastMeeting
          ? Math.floor((Date.now() - new Date(lastMeeting.meeting_date).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceLastMeeting > 30) {
          alertsList.push({
            id: `meeting-${studentId}`,
            type: 'meeting',
            severity: daysSinceLastMeeting > 60 ? 'critical' : 'high',
            title: 'Rencontre en retard',
            description: `Aucune rencontre depuis ${daysSinceLastMeeting} jours`,
            studentId,
            studentName,
            createdAt: new Date().toISOString(),
          });
        }

        // 3. Vérifier les fiches de rencontre en brouillon
        const { data: draftReports, count: draftCount } = await supabase
          .from('meeting_reports')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('supervisor_id', profile.id)
          .eq('status', 'draft');

        if (draftCount && draftCount > 0) {
          alertsList.push({
            id: `draft-${studentId}`,
            type: 'fiche',
            severity: 'medium',
            title: 'Fiches en brouillon',
            description: `${draftCount} fiche(s) de rencontre non soumise(s)`,
            studentId,
            studentName,
            createdAt: new Date().toISOString(),
          });
        }

        // 4. Vérifier les documents en attente de commentaire
        const { data: pendingDocs, count: pendingCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('status', 'submitted')
          .is('supervisor_comments', null);

        if (pendingCount && pendingCount > 0) {
          alertsList.push({
            id: `docs-${studentId}`,
            type: 'document',
            severity: 'high',
            title: 'Documents à évaluer',
            description: `${pendingCount} document(s) en attente de commentaire`,
            studentId,
            studentName,
            createdAt: new Date().toISOString(),
          });
        }

        // 5. Vérifier les évaluations manquantes
        const { data: ficheSuivi } = await supabase
          .from('fiche_suivi')
          .select('supervisor_validated, overall_progress')
          .eq('student_id', studentId)
          .eq('supervisor_id', profile.id)
          .single();

        if (ficheSuivi && !ficheSuivi.supervisor_validated && ficheSuivi.overall_progress >= 80) {
          alertsList.push({
            id: `eval-${studentId}`,
            type: 'evaluation',
            severity: 'high',
            title: 'Validation en attente',
            description: `Fiche de suivi à valider (progression: ${ficheSuivi.overall_progress}%)`,
            studentId,
            studentName,
            createdAt: new Date().toISOString(),
          });
        }

        // 6. Vérifier les messages non lus
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', studentId)
          .eq('recipient_id', profile.id)
          .eq('read', false);

        if (unreadCount && unreadCount > 0) {
          alertsList.push({
            id: `msg-${studentId}`,
            type: 'message',
            severity: 'low',
            title: 'Messages non lus',
            description: `${unreadCount} message(s) non lu(s)`,
            studentId,
            studentName,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Trier par sévérité puis par date
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      alertsList.sort((a, b) => {
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

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
      case 'meeting':
        return <Calendar className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      case 'fiche':
        return <Clock className="h-5 w-5" />;
      case 'evaluation':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'message':
        return <MessageSquare className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'all') return true;
    return alert.severity === filter;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const highCount = alerts.filter((a) => a.severity === 'high').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Centre d'Alertes
            </CardTitle>
            <CardDescription>
              {alerts.length} alerte(s) nécessitant votre attention
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Toutes ({alerts.length})
            </Button>
            <Button
              variant={filter === 'critical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('critical')}
              className={criticalCount > 0 ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Critiques ({criticalCount})
            </Button>
            <Button
              variant={filter === 'high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('high')}
              className={highCount > 0 ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              Urgentes ({highCount})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">Aucune alerte</p>
            <p className="text-sm text-gray-400">
              {filter === 'all'
                ? 'Tout est à jour !'
                : `Aucune alerte de niveau ${filter === 'critical' ? 'critique' : 'urgent'}`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border-2 rounded-lg ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{getIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-semibold">{alert.title}</p>
                        <p className="text-sm opacity-90">{alert.studentName}</p>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0">
                        {alert.severity === 'critical' && '🔴 Critique'}
                        {alert.severity === 'high' && '🟠 Urgent'}
                        {alert.severity === 'medium' && '🟡 Moyen'}
                        {alert.severity === 'low' && '🔵 Info'}
                      </Badge>
                    </div>
                    <p className="text-sm mb-3">{alert.description}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="bg-white">
                        Voir Détails
                      </Button>
                      {alert.type === 'message' && (
                        <Button size="sm" variant="outline" className="bg-white">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Répondre
                        </Button>
                      )}
                    </div>
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
