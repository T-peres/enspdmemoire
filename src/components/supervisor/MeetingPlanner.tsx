import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, MapPin, Save } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MeetingPlannerProps {
  themeId: string;
  studentId: string;
  onScheduled?: () => void;
}

/**
 * Planificateur de réunions pour l'encadreur
 * Permet de créer et planifier des réunions avec les étudiants
 */
export function MeetingPlanner({ themeId, studentId, onScheduled }: MeetingPlannerProps) {
  const { profile } = useAuth();
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('60');
  const [meetingType, setMeetingType] = useState<'in_person' | 'online' | 'phone'>('in_person');
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    if (!date || !profile) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      // Combiner date et heure
      const [hours, minutes] = time.split(':');
      const meetingDate = new Date(date);
      meetingDate.setHours(parseInt(hours), parseInt(minutes));

      // Créer la réunion
      const { error: meetingError } = await supabase
        .from('meetings')
        .insert({
          theme_id: themeId,
          student_id: studentId,
          supervisor_id: profile.id,
          meeting_date: meetingDate.toISOString(),
          duration_minutes: parseInt(duration),
          meeting_type: meetingType,
          location: location || null,
          agenda: agenda || null,
          status: 'scheduled',
        });

      if (meetingError) throw meetingError;

      // Notifier l'étudiant
      await supabase.rpc('create_notification', {
        p_user_id: studentId,
        p_title: 'Nouvelle Réunion Planifiée',
        p_message: `Une réunion a été planifiée le ${format(meetingDate, 'PPP à HH:mm', { locale: fr })}`,
        p_type: 'info',
        p_entity_type: 'meeting',
        p_entity_id: themeId,
      });

      toast.success('Réunion planifiée avec succès');
      
      // Réinitialiser le formulaire
      setDate(undefined);
      setTime('10:00');
      setDuration('60');
      setMeetingType('in_person');
      setLocation('');
      setAgenda('');
      
      onScheduled?.();
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast.error('Erreur lors de la planification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Planifier une Réunion
        </CardTitle>
        <CardDescription>
          Organisez une réunion de suivi avec l'étudiant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={fr}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Heure *</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Durée (minutes) *</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 heure</SelectItem>
                <SelectItem value="90">1h30</SelectItem>
                <SelectItem value="120">2 heures</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type de réunion *</Label>
            <Select value={meetingType} onValueChange={(v: any) => setMeetingType(v)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">Présentiel</SelectItem>
                <SelectItem value="online">En ligne</SelectItem>
                <SelectItem value="phone">Téléphone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">
            <MapPin className="inline h-4 w-4 mr-1" />
            Lieu / Lien (optionnel)
          </Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={
              meetingType === 'online'
                ? 'https://meet.google.com/...'
                : meetingType === 'in_person'
                ? 'Bureau 201, Bâtiment A'
                : 'Numéro de téléphone'
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agenda">Ordre du jour (optionnel)</Label>
          <Textarea
            id="agenda"
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            placeholder="Points à discuter lors de la réunion..."
            rows={4}
          />
        </div>

        <Button
          onClick={handleSchedule}
          disabled={loading || !date}
          className="w-full"
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Planification...' : 'Planifier la Réunion'}
        </Button>
      </CardContent>
    </Card>
  );
}
