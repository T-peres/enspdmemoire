import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, FileText, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Meeting {
  id: string;
  theme_id: string;
  student_id: string;
  supervisor_id: string;
  meeting_date: string;
  duration_minutes: number;
  location?: string;
  meeting_type: 'in_person' | 'online' | 'phone';
  agenda?: string;
  notes?: string;
  action_items?: string[];
  next_meeting_date?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  supervisor?: {
    first_name: string;
    last_name: string;
  };
}

interface MeetingHistoryCompleteProps {
  themeId: string;
}

/**
 * Historique complet des réunions avec l'encadreur
 * Affiche toutes les réunions passées et à venir avec détails
 */
export function MeetingHistoryComplete({ themeId }: MeetingHistoryCompleteProps) {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    if (themeId) {
      loadMeetings();
    }
  }, [themeId]);

  const loadMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          supervisor:profiles!meetings_supervisor_id_fkey(first_name, last_name)
        `)
        .eq('theme_id', themeId)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Meeting['status']) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50">Planifiée</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50">Terminée</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50">Annulée</Badge>;
    }
  };

  const getTypeBadge = (type: Meeting['meeting_type']) => {
    switch (type) {
      case 'in_person':
        return <Badge variant="secondary">Présentiel</Badge>;
      case 'online':
        return <Badge variant="secondary">En ligne</Badge>;
      case 'phone':
        return <Badge variant="secondary">Téléphone</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique des Réunions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Historique des Réunions
        </CardTitle>
        <CardDescription>
          {meetings.length} réunion{meetings.length > 1 ? 's' : ''} enregistrée{meetings.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Aucune réunion enregistrée
          </p>
        ) : (
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <Dialog key={meeting.id}>
                <DialogTrigger asChild>
                  <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(meeting.status)}
                          {getTypeBadge(meeting.meeting_type)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(meeting.meeting_date), 'PPP', { locale: fr })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Clock className="h-4 w-4" />
                          {meeting.duration_minutes} minutes
                        </div>
                        {meeting.supervisor && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            {meeting.supervisor.first_name} {meeting.supervisor.last_name}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Détails de la Réunion</DialogTitle>
                    <DialogDescription>
                      {format(new Date(meeting.meeting_date), 'PPP à HH:mm', { locale: fr })}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Informations</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Statut:</span>
                          {getStatusBadge(meeting.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Type:</span>
                          {getTypeBadge(meeting.meeting_type)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Durée:</span>
                          {meeting.duration_minutes} minutes
                        </div>
                        {meeting.location && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Lieu:</span>
                            {meeting.location}
                          </div>
                        )}
                      </div>
                    </div>

                    {meeting.agenda && (
                      <div>
                        <h4 className="font-semibold mb-2">Ordre du jour</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {meeting.agenda}
                        </p>
                      </div>
                    )}

                    {meeting.notes && (
                      <div>
                        <h4 className="font-semibold mb-2">Notes de réunion</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {meeting.notes}
                        </p>
                      </div>
                    )}

                    {meeting.action_items && meeting.action_items.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Actions à réaliser</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {meeting.action_items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {meeting.next_meeting_date && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="font-semibold mb-1 text-blue-900">Prochaine réunion</h4>
                        <p className="text-sm text-blue-700">
                          {format(new Date(meeting.next_meeting_date), 'PPP à HH:mm', { locale: fr })}
                        </p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
