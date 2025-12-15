import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Calendar, Clock, Plus } from 'lucide-react';

interface MeetingSchedulerProps {
  supervisorId: string;
  supervisorName: string;
  themeId: string;
  onSuccess?: () => void;
}

export function MeetingScheduler({ supervisorId, supervisorName, themeId, onSuccess }: MeetingSchedulerProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    meeting_date: '',
    meeting_time: '',
    duration_minutes: 60,
    objectives: '',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!profile || !formData.meeting_date || !formData.meeting_time || !formData.objectives) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      // Combiner date et heure
      const meetingDateTime = new Date(`${formData.meeting_date}T${formData.meeting_time}`);
      
      // Vérifier que la date n'est pas dans le passé
      if (meetingDateTime < new Date()) {
        toast.error('La date de rencontre ne peut pas être dans le passé');
        return;
      }

      // Créer la demande de rencontre
      const { error } = await supabase.from('supervisor_meetings').insert({
        theme_id: themeId,
        supervisor_id: supervisorId,
        student_id: profile.id,
        meeting_date: meetingDateTime.toISOString(),
        duration_minutes: formData.duration_minutes,
        objectives: formData.objectives,
        student_notes: formData.notes || null,
        status: 'requested',
        requested_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Créer une notification pour l'encadreur
      await supabase.rpc('create_notification', {
        p_user_id: supervisorId,
        p_title: 'Demande de Rencontre',
        p_message: `${profile.first_name} ${profile.last_name} souhaite planifier une rencontre le ${meetingDateTime.toLocaleDateString('fr-FR')} à ${meetingDateTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
        p_type: 'info',
        p_entity_type: 'meeting',
      });

      toast.success('Demande de rencontre envoyée');
      
      // Reset form
      setFormData({
        meeting_date: '',
        meeting_time: '',
        duration_minutes: 60,
        objectives: '',
        notes: '',
      });
      setShowForm(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error scheduling meeting:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Obtenir la date minimale (aujourd'hui)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planifier une Rencontre
            </CardTitle>
            <CardDescription>
              Demander un rendez-vous avec {supervisorName}
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            {showForm ? 'Annuler' : 'Nouvelle demande'}
          </Button>
        </div>
      </CardHeader>
      
      {showForm && (
        <CardContent className="space-y-4 border-t pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meeting_date">Date souhaitée *</Label>
              <Input
                id="meeting_date"
                type="date"
                min={today}
                value={formData.meeting_date}
                onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="meeting_time">Heure souhaitée *</Label>
              <Input
                id="meeting_time"
                type="time"
                value={formData.meeting_time}
                onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Durée estimée (minutes)</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                id="duration"
                type="number"
                min="15"
                max="180"
                step="15"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="objectives">Objectifs de la rencontre *</Label>
            <Textarea
              id="objectives"
              value={formData.objectives}
              onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
              placeholder="Décrivez les points que vous souhaitez aborder..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes additionnelles (optionnel)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informations complémentaires, préparation requise..."
              rows={2}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.meeting_date || !formData.meeting_time || !formData.objectives}
            className="w-full"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}