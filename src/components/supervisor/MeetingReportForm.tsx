import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CalendarIcon, Save, Send } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MeetingReportFormProps {
  themeId: string;
  studentId: string;
  onSuccess?: () => void;
}

export function MeetingReportForm({ themeId, studentId, onSuccess }: MeetingReportFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [meetingDate, setMeetingDate] = useState<Date>();
  const [formData, setFormData] = useState({
    duration_minutes: 60,
    objectives: '',
    work_completed: '',
    chapters_discussed: '',
    corrections_needed: '',
    problems_encountered: '',
    recommendations: '',
  });

  const handleSubmit = async (status: 'draft' | 'submitted') => {
    if (!profile || !meetingDate) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!formData.objectives || !formData.recommendations) {
      toast.error('Les objectifs et recommandations sont obligatoires');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('supervisor_meetings').insert({
        theme_id: themeId,
        student_id: studentId,
        supervisor_id: profile.id,
        meeting_date: meetingDate.toISOString(),
        ...formData,
        status,
        submitted_at: status === 'submitted' ? new Date().toISOString() : null,
        created_by: profile.id,
      });

      if (error) throw error;

      // Créer une notification pour l'étudiant
      if (status === 'submitted') {
        await supabase.rpc('create_notification', {
          p_user_id: studentId,
          p_title: 'Nouvelle Fiche de Rencontre',
          p_message: `Votre encadreur a créé une fiche de rencontre du ${format(meetingDate, 'PPP', { locale: fr })}`,
          p_type: 'info',
          p_entity_type: 'meeting',
        });
      }

      toast.success(
        status === 'submitted'
          ? 'Fiche de rencontre soumise avec succès'
          : 'Brouillon enregistré'
      );

      // Reset form
      setFormData({
        duration_minutes: 60,
        objectives: '',
        work_completed: '',
        chapters_discussed: '',
        corrections_needed: '',
        problems_encountered: '',
        recommendations: '',
      });
      setMeetingDate(undefined);

      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer une Fiche de Rencontre</CardTitle>
        <CardDescription>
          Documentez votre rencontre avec l'étudiant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="meeting_date">Date de la rencontre *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !meetingDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {meetingDate ? format(meetingDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={meetingDate}
                  onSelect={setMeetingDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Durée (minutes)</Label>
            <Input
              id="duration"
              name="duration"
              type="number"
              value={formData.duration_minutes}
              onChange={(e) =>
                setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })
              }
              min={15}
              step={15}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="objectives">Objectifs fixés *</Label>
          <Textarea
            id="objectives"
            value={formData.objectives}
            onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
            placeholder="Quels sont les objectifs fixés lors de cette rencontre ?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="work_completed">Travail réalisé</Label>
          <Textarea
            id="work_completed"
            value={formData.work_completed}
            onChange={(e) => setFormData({ ...formData, work_completed: e.target.value })}
            placeholder="Quel travail l'étudiant a-t-il réalisé depuis la dernière rencontre ?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chapters_discussed">Chapitres traités</Label>
          <Textarea
            id="chapters_discussed"
            value={formData.chapters_discussed}
            onChange={(e) => setFormData({ ...formData, chapters_discussed: e.target.value })}
            placeholder="Quels chapitres ont été discutés ? Quel est leur état d'avancement ?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="corrections_needed">Corrections nécessaires</Label>
          <Textarea
            id="corrections_needed"
            value={formData.corrections_needed}
            onChange={(e) => setFormData({ ...formData, corrections_needed: e.target.value })}
            placeholder="Quelles corrections ou améliorations sont nécessaires ?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="problems_encountered">Problèmes rencontrés</Label>
          <Textarea
            id="problems_encountered"
            value={formData.problems_encountered}
            onChange={(e) => setFormData({ ...formData, problems_encountered: e.target.value })}
            placeholder="Quels problèmes ou difficultés l'étudiant a-t-il rencontrés ?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recommendations">Recommandations *</Label>
          <Textarea
            id="recommendations"
            value={formData.recommendations}
            onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
            placeholder="Quelles sont vos recommandations pour la suite ?"
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => handleSubmit('draft')}
            disabled={loading}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Enregistrer comme brouillon
          </Button>
          <Button
            onClick={() => handleSubmit('submitted')}
            disabled={loading}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            Soumettre la fiche
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
