import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CalendarIcon, Clock, MapPin, Users, Save } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DefenseSchedulingCompleteProps {
  themeId: string;
  studentId: string;
  onSuccess?: () => void;
}

export function DefenseSchedulingComplete({ themeId, studentId, onSuccess }: DefenseSchedulingCompleteProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    defense_time: '',
    room: '',
    duration_minutes: 60,
    president_id: '',
    examiner_id: '',
    rapporteur_id: '',
  });
  const [juryMembers, setJuryMembers] = useState<any[]>([]);

  // Charger les membres du jury potentiels
  useEffect(() => {
    loadJuryMembers();
  }, []);

  const loadJuryMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('department_id', profile?.department_id)
        .order('last_name');

      if (error) throw error;
      setJuryMembers(data || []);
    } catch (error: any) {
      console.error('Error loading jury members:', error);
    }
  };

  const handleSchedule = async () => {
    if (!profile || !date || !formData.defense_time || !formData.room) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!formData.president_id || !formData.examiner_id || !formData.rapporteur_id) {
      toast.error('Veuillez sélectionner tous les membres du jury');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('defenses').insert({
        theme_id: themeId,
        student_id: studentId,
        defense_date: date.toISOString(),
        defense_time: formData.defense_time,
        room: formData.room,
        duration_minutes: formData.duration_minutes,
        president_id: formData.president_id,
        examiner_id: formData.examiner_id,
        rapporteur_id: formData.rapporteur_id,
        status: 'scheduled',
        created_by: profile.id,
      });

      if (error) throw error;

      // Créer des notifications pour l'étudiant et les membres du jury
      const notificationPromises = [
        supabase.rpc('create_notification', {
          p_user_id: studentId,
          p_title: 'Soutenance Planifiée',
          p_message: `Votre soutenance est prévue le ${format(date, 'PPP', { locale: fr })} à ${formData.defense_time} en salle ${formData.room}`,
          p_type: 'info',
          p_entity_type: 'defense',
        }),
        ...([formData.president_id, formData.examiner_id, formData.rapporteur_id].map(memberId =>
          supabase.rpc('create_notification', {
            p_user_id: memberId,
            p_title: 'Nouvelle Soutenance',
            p_message: `Vous êtes membre du jury d'une soutenance le ${format(date, 'PPP', { locale: fr })}`,
            p_type: 'info',
            p_entity_type: 'defense',
          })
        )),
      ];

      await Promise.all(notificationPromises);

      toast.success('Soutenance planifiée avec succès');
      
      // Reset form
      setDate(undefined);
      setFormData({
        defense_time: '',
        room: '',
        duration_minutes: 60,
        president_id: '',
        examiner_id: '',
        rapporteur_id: '',
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error scheduling defense:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Planifier une Soutenance
        </CardTitle>
        <CardDescription>
          Définir la date, l'heure, le lieu et le jury
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="defense_date">Date de soutenance *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
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
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defense_time">Heure *</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="defense_time"
                type="time"
                value={formData.defense_time}
                onChange={(e) => setFormData({ ...formData, defense_time: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room">Salle *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="room"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                placeholder="Ex: Amphi A"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Durée (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              min={30}
              step={15}
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            <span>Composition du Jury</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="president">Président *</Label>
              <Select
                value={formData.president_id}
                onValueChange={(value) => setFormData({ ...formData, president_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {juryMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="examiner">Examinateur *</Label>
              <Select
                value={formData.examiner_id}
                onValueChange={(value) => setFormData({ ...formData, examiner_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {juryMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rapporteur">Rapporteur *</Label>
              <Select
                value={formData.rapporteur_id}
                onValueChange={(value) => setFormData({ ...formData, rapporteur_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {juryMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSchedule}
          disabled={loading}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Planification en cours...' : 'Planifier la Soutenance'}
        </Button>
      </CardContent>
    </Card>
  );
}
