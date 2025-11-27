import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Download, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface Meeting {
  id: string;
  meeting_date: string;
  duration_minutes: number;
  objectives: string;
  work_completed?: string;
  recommendations: string;
  status: string;
  validated_at?: string;
  rejection_reason?: string;
}

interface MeetingsTimelineProps {
  meetings: Meeting[];
}

export function MeetingsTimeline({ meetings }: MeetingsTimelineProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Brouillon', variant: 'secondary' as const, icon: Clock },
      submitted: { label: 'En attente', variant: 'default' as const, icon: Clock },
      validated: { label: 'Validée', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Rejetée', variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleDownload = (meeting: Meeting) => {
    // Générer un PDF de la fiche de rencontre
    toast.info('Génération du PDF en cours...');
  };

  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Aucune rencontre enregistrée pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline des Rencontres</CardTitle>
        <CardDescription>
          Historique de vos rencontres avec votre encadreur
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {meetings.map((meeting, index) => (
            <div key={meeting.id} className="relative pl-10">
              {/* Timeline dot */}
              <div className={`absolute left-2.5 top-2 h-3 w-3 rounded-full border-2 ${
                meeting.status === 'validated' 
                  ? 'bg-green-500 border-green-500' 
                  : meeting.status === 'rejected'
                  ? 'bg-red-500 border-red-500'
                  : 'bg-blue-500 border-blue-500'
              }`} />

              <Card className={meeting.status === 'validated' ? 'border-green-200' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">
                          {format(new Date(meeting.meeting_date), 'PPP', { locale: fr })}
                        </CardTitle>
                      </div>
                      <CardDescription>
                        Durée: {meeting.duration_minutes} minutes
                      </CardDescription>
                    </div>
                    {getStatusBadge(meeting.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Objectifs fixés</h4>
                    <p className="text-sm text-muted-foreground">{meeting.objectives}</p>
                  </div>

                  {meeting.work_completed && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Travail réalisé</h4>
                      <p className="text-sm text-muted-foreground">{meeting.work_completed}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-sm mb-1">Recommandations</h4>
                    <p className="text-sm text-muted-foreground">{meeting.recommendations}</p>
                  </div>

                  {meeting.status === 'validated' && meeting.validated_at && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        Validée le {format(new Date(meeting.validated_at), 'PPP', { locale: fr })}
                      </span>
                    </div>
                  )}

                  {meeting.status === 'rejected' && meeting.rejection_reason && (
                    <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      <XCircle className="h-4 w-4 mt-0.5" />
                      <div>
                        <p className="font-semibold">Raison du rejet:</p>
                        <p>{meeting.rejection_reason}</p>
                      </div>
                    </div>
                  )}

                  {meeting.status === 'validated' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(meeting)}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger / Imprimer
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
