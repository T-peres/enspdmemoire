import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Meeting {
  id: string;
  meeting_date: string;
  duration_minutes: number;
  objectives: string;
  work_completed?: string;
  chapters_discussed?: string;
  corrections_needed?: string;
  problems_encountered?: string;
  recommendations: string;
  status: string;
  submitted_at?: string;
  validated_at?: string;
  rejection_reason?: string;
}

interface MeetingsListProps {
  meetings: Meeting[];
  onEdit?: (meetingId: string) => void;
  onDelete?: (meetingId: string) => void;
}

export function MeetingsList({ meetings, onEdit, onDelete }: MeetingsListProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Brouillon', variant: 'secondary' as const },
      submitted: { label: 'Soumise', variant: 'default' as const },
      validated: { label: 'Validée', variant: 'default' as const },
      rejected: { label: 'Rejetée', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Aucune fiche de rencontre enregistrée
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <Card key={meeting.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-lg">
                    {format(new Date(meeting.meeting_date), 'PPP', { locale: fr })}
                  </CardTitle>
                  {getStatusBadge(meeting.status)}
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Durée: {meeting.duration_minutes} minutes
                </CardDescription>
              </div>
              {meeting.status === 'draft' && (
                <div className="flex gap-2">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(meeting.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette fiche ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(meeting.id)}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {meeting.chapters_discussed && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Chapitres traités</h4>
                <p className="text-sm text-muted-foreground">{meeting.chapters_discussed}</p>
              </div>
            )}

            {meeting.corrections_needed && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Corrections nécessaires</h4>
                <p className="text-sm text-muted-foreground">{meeting.corrections_needed}</p>
              </div>
            )}

            {meeting.problems_encountered && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Problèmes rencontrés</h4>
                <p className="text-sm text-muted-foreground">{meeting.problems_encountered}</p>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
