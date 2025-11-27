import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Theme, JuryDecision } from '@/types/database';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface JuryDeliberationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: Theme;
  onSuccess: () => void;
}

export function JuryDeliberationDialog({ open, onOpenChange, theme, onSuccess }: JuryDeliberationDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [defenseDate, setDefenseDate] = useState<Date>();
  const [decision, setDecision] = useState<JuryDecision>('pending');
  const [grade, setGrade] = useState('');
  const [mention, setMention] = useState('');
  const [correctionsRequired, setCorrectionsRequired] = useState(false);
  const [correctionsDeadline, setCorrectionsDeadline] = useState<Date>();
  const [correctionsDescription, setCorrectionsDescription] = useState('');
  const [deliberationNotes, setDeliberationNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!defenseDate) {
      toast.error('Veuillez sélectionner une date de soutenance');
      return;
    }

    if (decision === 'approved' && !grade) {
      toast.error('Veuillez saisir une note');
      return;
    }

    if (correctionsRequired && !correctionsDeadline) {
      toast.error('Veuillez définir une deadline pour les corrections');
      return;
    }

    setLoading(true);

    try {
      // Vérifier si une décision existe déjà
      const { data: existingDecision } = await supabase
        .from('jury_decisions')
        .select('id')
        .eq('theme_id', theme.id)
        .single();

      const decisionData = {
        theme_id: theme.id,
        student_id: theme.student_id,
        defense_date: defenseDate.toISOString(),
        decision,
        grade: grade ? parseFloat(grade) : null,
        mention: mention || null,
        corrections_required: correctionsRequired,
        corrections_deadline: correctionsDeadline?.toISOString() || null,
        corrections_description: correctionsDescription || null,
        deliberation_notes: deliberationNotes || null,
        decided_at: new Date().toISOString(),
      };

      if (existingDecision) {
        // Mettre à jour
        const { error } = await supabase
          .from('jury_decisions')
          .update(decisionData)
          .eq('id', existingDecision.id);

        if (error) throw error;
      } else {
        // Créer
        const { error } = await supabase
          .from('jury_decisions')
          .insert(decisionData);

        if (error) throw error;
      }

      // Créer une notification pour l'étudiant
      await supabase.rpc('create_notification', {
        p_user_id: theme.student_id,
        p_title: 'Délibération du Jury',
        p_message: `Le jury a délibéré sur votre mémoire "${theme.title}". Décision: ${
          decision === 'approved' ? 'Approuvé' :
          decision === 'corrections_required' ? 'Corrections requises' :
          'Rejeté'
        }`,
        p_type: decision === 'approved' ? 'success' : decision === 'corrections_required' ? 'warning' : 'error',
        p_entity_type: 'jury_decision',
        p_entity_id: theme.id,
      });

      toast.success('Délibération enregistrée avec succès');
      onSuccess();
    } catch (error) {
      console.error('Error saving deliberation:', error);
      toast.error('Erreur lors de l\'enregistrement de la délibération');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Délibération du Jury</DialogTitle>
          <DialogDescription>
            Mémoire: {theme.title}
            <br />
            Étudiant: {theme.student?.first_name} {theme.student?.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date de soutenance */}
          <div className="space-y-2">
            <Label htmlFor="defense-date">Date de Soutenance *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {defenseDate ? format(defenseDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={defenseDate}
                  onSelect={setDefenseDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Décision */}
          <div className="space-y-2">
            <Label htmlFor="decision">Décision *</Label>
            <Select value={decision} onValueChange={(value) => setDecision(value as JuryDecision)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une décision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="corrections_required">Corrections requises</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Note et Mention (si approuvé) */}
          {decision === 'approved' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Note /20 *</Label>
                  <Input
                    id="grade"
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Ex: 15.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mention">Mention</Label>
                  <Select value={mention} onValueChange={setMention}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Passable">Passable</SelectItem>
                      <SelectItem value="Assez Bien">Assez Bien</SelectItem>
                      <SelectItem value="Bien">Bien</SelectItem>
                      <SelectItem value="Très Bien">Très Bien</SelectItem>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Corrections requises */}
          <div className="flex items-center space-x-2">
            <Switch
              id="corrections"
              checked={correctionsRequired}
              onCheckedChange={setCorrectionsRequired}
            />
            <Label htmlFor="corrections">Corrections requises</Label>
          </div>

          {correctionsRequired && (
            <>
              <div className="space-y-2">
                <Label htmlFor="corrections-deadline">Deadline pour les corrections *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {correctionsDeadline ? format(correctionsDeadline, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={correctionsDeadline}
                      onSelect={setCorrectionsDeadline}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="corrections-description">Description des corrections</Label>
                <Textarea
                  id="corrections-description"
                  value={correctionsDescription}
                  onChange={(e) => setCorrectionsDescription(e.target.value)}
                  placeholder="Décrivez les corrections à apporter..."
                  rows={4}
                />
              </div>
            </>
          )}

          {/* Notes de délibération */}
          <div className="space-y-2">
            <Label htmlFor="deliberation-notes">Notes de délibération</Label>
            <Textarea
              id="deliberation-notes"
              value={deliberationNotes}
              onChange={(e) => setDeliberationNotes(e.target.value)}
              placeholder="Notes internes du jury..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer la Délibération'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
