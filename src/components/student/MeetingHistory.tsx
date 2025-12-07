import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, User, FileText } from 'lucide-react';
import { toast } from 'sonner';

export function MeetingHistory() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchMeetings();
    }
  }, [profile]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          supervisor:profiles!meetings_supervisor_id_fkey(first_name, last_name)
        `)
        .eq('student_id', profile?.id)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      toast.error('Erreur lors du chargement des rencontres');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Historique des Rencontres
        </CardTitle>
        <CardDescription>
          Toutes vos rencontres avec votre encadreur
        </CardDescription>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Aucune rencontre enregistrée</p>
            <p className="text-sm text-gray-500">
              Les rencontres avec votre encadreur apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">
                      {new Date(meeting.meeting_date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <Badge variant={meeting.meeting_type === 'in_person' ? 'default' : 'secondary'}>
                    {meeting.meeting_type === 'in_person' ? 'En personne' : 'En ligne'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <span>
                      Avec {meeting.supervisor?.first_name} {meeting.supervisor?.last_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Durée: {meeting.duration_minutes} minutes</span>
                  </div>

                  {meeting.topics_discussed && meeting.topics_discussed.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium text-gray-700 mb-1">Sujets discutés:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {meeting.topics_discussed.map((topic: string, index: number) => (
                          <li key={index}>{topic}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {meeting.next_steps && (
                    <div className="mt-3 bg-blue-50 rounded-lg p-3">
                      <p className="font-medium text-blue-900 mb-1">Prochaines étapes:</p>
                      <p className="text-blue-700">{meeting.next_steps}</p>
                    </div>
                  )}

                  {meeting.student_progress_notes && (
                    <div className="mt-3">
                      <p className="font-medium text-gray-700 mb-1">Notes de progression:</p>
                      <p className="text-gray-600">{meeting.student_progress_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
