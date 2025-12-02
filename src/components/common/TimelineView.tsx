import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Clock, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'milestone' | 'submission' | 'validation' | 'meeting' | 'alert';
  status: 'completed' | 'pending' | 'upcoming';
}

interface TimelineViewProps {
  themeId: string;
}

/**
 * Vue chronologique des événements
 * Affiche l'historique et les jalons du mémoire
 */
export function TimelineView({ themeId }: TimelineViewProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (themeId) {
      loadTimeline();
    }
  }, [themeId]);

  const loadTimeline = async () => {
    try {
      const timelineEvents: TimelineEvent[] = [];

      // Charger les documents soumis
      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('theme_id', themeId)
        .order('submitted_at', { ascending: false });

      documents?.forEach(doc => {
        timelineEvents.push({
          id: `doc-${doc.id}`,
          date: doc.submitted_at,
          title: `Document soumis: ${doc.title}`,
          description: `Type: ${doc.document_type} - Statut: ${doc.status}`,
          type: 'submission',
          status: doc.status === 'approved' ? 'completed' : 'pending',
        });

        if (doc.reviewed_at) {
          timelineEvents.push({
            id: `review-${doc.id}`,
            date: doc.reviewed_at,
            title: `Document évalué: ${doc.title}`,
            description: doc.feedback || 'Document évalué par l\'encadreur',
            type: 'validation',
            status: 'completed',
          });
        }
      });

      // Charger les réunions
      const { data: meetings } = await supabase
        .from('meetings')
        .select('*')
        .eq('theme_id', themeId)
        .order('meeting_date', { ascending: false });

      meetings?.forEach(meeting => {
        const isPast = new Date(meeting.meeting_date) < new Date();
        timelineEvents.push({
          id: `meeting-${meeting.id}`,
          date: meeting.meeting_date,
          title: `Réunion ${meeting.status === 'completed' ? 'terminée' : 'planifiée'}`,
          description: meeting.notes || meeting.agenda || 'Réunion de suivi',
          type: 'meeting',
          status: meeting.status === 'completed' ? 'completed' : isPast ? 'pending' : 'upcoming',
        });
      });

      // Charger le thème
      const { data: theme } = await supabase
        .from('themes')
        .select('*')
        .eq('id', themeId)
        .single();

      if (theme) {
        timelineEvents.push({
          id: `theme-${theme.id}`,
          date: theme.submitted_at,
          title: 'Thème soumis',
          description: theme.title,
          type: 'milestone',
          status: 'completed',
        });

        if (theme.reviewed_at) {
          timelineEvents.push({
            id: `theme-review-${theme.id}`,
            date: theme.reviewed_at,
            title: `Thème ${theme.status === 'approved' ? 'approuvé' : 'évalué'}`,
            description: theme.rejection_reason || theme.revision_notes || 'Thème évalué',
            type: 'validation',
            status: 'completed',
          });
        }
      }

      // Trier par date décroissante
      timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setEvents(timelineEvents);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: TimelineEvent['type'], status: TimelineEvent['status']) => {
    if (status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (status === 'upcoming') {
      return <Clock className="h-5 w-5 text-blue-600" />;
    }
    return <Circle className="h-5 w-5 text-gray-400" />;
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'milestone':
        return 'border-purple-300 bg-purple-50';
      case 'submission':
        return 'border-blue-300 bg-blue-50';
      case 'validation':
        return 'border-green-300 bg-green-50';
      case 'meeting':
        return 'border-orange-300 bg-orange-50';
      case 'alert':
        return 'border-red-300 bg-red-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getStatusBadge = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50">Terminé</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50">En cours</Badge>;
      case 'upcoming':
        return <Badge variant="outline" className="bg-blue-50">À venir</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chronologie</CardTitle>
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
          <Clock className="h-5 w-5" />
          Chronologie du Mémoire
        </CardTitle>
        <CardDescription>
          Historique complet des événements et jalons
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Aucun événement enregistré
          </p>
        ) : (
          <div className="relative">
            {/* Ligne verticale */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-6">
              {events.map((event, index) => (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icône */}
                  <div className="relative z-10 flex-shrink-0">
                    {getEventIcon(event.type, event.status)}
                  </div>

                  {/* Contenu */}
                  <div className={`flex-1 border rounded-lg p-4 ${getEventColor(event.type)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{event.title}</h4>
                      {getStatusBadge(event.status)}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{event.description}</p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(event.date), 'PPP à HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
