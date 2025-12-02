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
  CheckCircle2, 
  XCircle,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'correction' | 'fiche' | 'defense' | 'plagiarism' | 'meeting' | 'document';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  createdAt: string;
}

export function StudentAlertsComplete() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

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

      // 1. Récupérer le thème de l'étudiant
      const { data: selection } = await supabase
        .from('topic_selections')
        .select('topic_id, topic:thesis_topics(*)')
        .eq('student_id', profile.id)
        .eq('status', 'confirmed')
        .single();

      if (!selection?.topic_id) {
        alertsList.push({
          id: 'no-topic',
          type: 'document',
          severity: 'critical',
          title: 'Aucun sujet sélectionné',
          description: 'Vous devez sélectionner un sujet de mémoire pour commencer',
          actionLabel: 'Choisir un sujet',
          actionUrl: '/topics',
          createdAt: new Date().toISOString(),
        });
        setAlerts(alertsList);
        setLoading(false);
        return;
      }

      const themeId = selection.topic_id;

      // 2. Vérifier les documents en révision
      const { data: revisionDocs, count: revisionCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact' })
        .eq('student_id', profile.id)
        .eq('status', 'revision_requested');

      if (revisionCount && revisionCount > 0) {
        alertsList.push({
          id: 'revision-needed',
          type: 'correction',
          severity: 'error',
          title: 'Corrections à apporter',
          description: `${revisionCount} document(s) nécessite(nt) des corrections`,
          actionLabel: 'Voir les documents',
          createdAt: new Date().toISOString(),
        });
      }

      // 3. Vérifier l'état de la fiche de suivi
      const { data: ficheSuivi } = await supabase
        .from('fiche_suivi')
        .select('*')
        .eq('theme_id', themeId)
        .eq('student_id', profile.id)
        .single();

      if (ficheSuivi) {
        // Fiche rejetée par le chef de département
        if (ficheSuivi.supervisor_validated && !ficheSuivi.department_head_validated && ficheSuivi.department_head_comments) {
          alertsList.push({
            id: 'fiche-rejected',
            type: 'fiche',
            severity: 'error',
            title: 'Fiche de suivi rejetée',
            description: ficheSuivi.department_head_comments,
            createdAt: new Date().toISOString(),
          });
        }

        // Fiche non validée par l'encadreur
        if (!ficheSuivi.supervisor_validated && ficheSuivi.overall_progress >= 50) {
          alertsList.push({
            id: 'fiche-not-validated',
            type: 'fiche',
            severity: 'warning',
            title: 'Fiche de suivi non validée',
            description: 'Votre fiche de suivi n\'a pas encore été validée par votre encadreur',
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 4. Vérifier les rencontres
      const { data: meetings, count: meetingsCount } = await supabase
        .from('meeting_reports')
        .select('*', { count: 'exact' })
        .eq('student_id', profile.id)
        .eq('status', 'validated')
        .order('meeting_date', { ascending: false });

      // Récupérer le nombre minimum requis
      const { data: settings } = await supabase
        .from('department_settings')
        .select('min_meetings_required')
        .eq('department_id', profile.department_id)
        .single();

      const minMeetings = settings?.min_meetings_required || 3;
      const actualMeetings = meetingsCount || 0;

      if (actualMeetings < minMeetings) {
        alertsList.push({
          id: 'meetings-insufficient',
          type: 'meeting',
          severity: actualMeetings === 0 ? 'error' : 'warning',
          title: 'Rencontres insuffisantes',
          description: `Vous avez ${actualMeetings}/${minMeetings} rencontres validées. Planifiez des rencontres avec votre encadreur.`,
          createdAt: new Date().toISOString(),
        });
      }

      // Vérifier la dernière rencontre
      if (meetings && meetings.length > 0) {
        const lastMeeting = meetings[0];
        const daysSinceLastMeeting = Math.floor(
          (Date.now() - new Date(lastMeeting.meeting_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastMeeting > 30) {
          alertsList.push({
            id: 'meeting-overdue',
            type: 'meeting',
            severity: 'warning',
            title: 'Rencontre en retard',
            description: `Dernière rencontre il y a ${daysSinceLastMeeting} jours. Contactez votre encadreur.`,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 5. Vérifier le plagiat
      const { data: plagiarismReport } = await supabase
        .from('plagiarism_reports')
        .select('*')
        .eq('theme_id', themeId)
        .order('checked_at', { ascending: false })
        .limit(1)
        .single();

      if (plagiarismReport) {
        const threshold = settings?.plagiarism_threshold || 20;
        const score = plagiarismReport.plagiarism_score || 0;

        if (score > threshold) {
          alertsList.push({
            id: 'plagiarism-high',
            type: 'plagiarism',
            severity: 'critical',
            title: 'Score de plagiat élevé',
            description: `Votre score de plagiat (${score}%) dépasse le seuil autorisé (${threshold}%). Vous devez corriger votre document.`,
            actionLabel: 'Voir le rapport',
            createdAt: new Date().toISOString(),
          });
        } else if (score > threshold * 0.8) {
          alertsList.push({
            id: 'plagiarism-warning',
            type: 'plagiarism',
            severity: 'warning',
            title: 'Attention au plagiat',
            description: `Votre score de plagiat (${score}%) approche du seuil limite (${threshold}%).`,
            actionLabel: 'Voir le rapport',
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 6. Vérifier la date de soutenance
      const { data: defenseSession } = await supabase
        .from('defense_sessions')
        .select('*')
        .eq('student_id', profile.id)
        .single();

      if (defenseSession && defenseSession.scheduled_date) {
        const daysUntilDefense = Math.floor(
          (new Date(defenseSession.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilDefense > 0 && daysUntilDefense <= 7) {
          alertsList.push({
            id: 'defense-soon',
            type: 'defense',
            severity: 'info',
            title: 'Soutenance prochainement',
            description: `Votre soutenance est prévue dans ${daysUntilDefense} jour(s) le ${new Date(defenseSession.scheduled_date).toLocaleDateString('fr-FR')}`,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 7. Vérifier les documents manquants
      const { data: documents } = await supabase
        .from('documents')
        .select('document_type')
        .eq('student_id', profile.id);

      const submittedTypes = documents?.map(d => d.document_type) || [];
      const requiredTypes = ['plan', 'chapter_1', 'chapter_2', 'chapter_3', 'chapter_4', 'final_version'];
      const missingTypes = requiredTypes.filter(t => !submittedTypes.includes(t));

      if (missingTypes.length > 0 && ficheSuivi && ficheSuivi.overall_progress > 30) {
        alertsList.push({
          id: 'documents-missing',
          type: 'document',
          severity: 'warning',
          title: 'Documents manquants',
          description: `${missingTypes.length} type(s) de document(s) non encore déposé(s)`,
          createdAt: new Date().toISOString(),
        });
      }

      // Trier par sévérité
      const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
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
      case 'error':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'correction':
        return <FileText className="h-5 w-5" />;
      case 'fiche':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'defense':
        return <Calendar className="h-5 w-5" />;
      case 'plagiarism':
        return <AlertCircle className="h-5 w-5" />;
      case 'meeting':
        return <Clock className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
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
  const errorCount = alerts.filter(a => a.severity === 'error').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Mes Alertes
              {(criticalCount + errorCount) > 0 && (
                <Badge variant="destructive">
                  {criticalCount + errorCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Points d'attention concernant votre mémoire
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
              Tout est en ordre ! Continuez votre bon travail.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
                      <Badge variant="outline" className="flex-shrink-0">
                        {alert.severity === 'critical' && '🔴'}
                        {alert.severity === 'error' && '🟠'}
                        {alert.severity === 'warning' && '🟡'}
                        {alert.severity === 'info' && '🔵'}
                      </Badge>
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
