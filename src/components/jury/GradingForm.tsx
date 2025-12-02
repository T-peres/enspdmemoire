import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Award, Save, AlertCircle } from 'lucide-react';

interface GradingFormProps {
  themeId: string;
  studentId: string;
  onGraded?: () => void;
}

/**
 * Formulaire de notation du jury
 * Permet d'enregistrer la décision, la note et la mention
 */
export function GradingForm({ themeId, studentId, onGraded }: GradingFormProps) {
  const { profile } = useAuth();
  const [decision, setDecision] = useState<'approved' | 'corrections_required' | 'rejected'>('approved');
  const [grade, setGrade] = useState('');
  const [mention, setMention] = useState('');
  const [correctionsRequired, setCorrectionsRequired] = useState(false);
  const [correctionsDescription, setCorrectionsDescription] = useState('');
  const [correctionsDeadline, setCorrectionsDeadline] = useState('');
  const [deliberationNotes, setDeliberationNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!grade || parseFloat(grade) < 0 || parseFloat(grade) > 20) {
      toast.error('Veuillez entrer une note valide entre 0 et 20');
      return;
    }

    if (correctionsRequired && !correctionsDescription.trim()) {
      toast.error('Veuillez décrire les corrections requises');
      return;
    }

    setLoading(true);

    try {
      const gradeValue = parseFloat(grade);

      // Créer ou mettre à jour la décision du jury
      const { data: existingDecision } = await supabase
        .from('jury_decisions')
        .select('id')
        .eq('theme_id', themeId)
        .single();

      const decisionData = {
        theme_id: themeId,
        student_id: studentId,
        decision,
        grade: gradeValue,
        mention: mention || null,
        corrections_required: correctionsRequired,
        corrections_description: correctionsRequired ? correctionsDescription : null,
        corrections_deadline: correctionsRequired && correctionsDeadline ? correctionsDeadline : null,
        deliberation_notes: deliberationNotes || null,
        decided_at: new Date().toISOString(),
      };

      if (existingDecision) {
        const { error } = await supabase
          .from('jury_decisions')
          .update(decisionData)
          .eq('id', existingDecision.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('jury_decisions')
          .insert(decisionData);

        if (error) throw error;
      }

      // Notifier l'étudiant
      const notificationMessage = decision === 'approved'
        ? `Félicitations ! Votre mémoire a été approuvé avec la note de ${gradeValue}/20${mention ? ` - Mention: ${mention}` : ''}`
        : decision === 'corrections_required'
        ? `Des corrections sont requises sur votre mémoire. Note: ${gradeValue}/20`
        : `Votre mémoire n'a pas été approuvé. Note: ${gradeValue}/20`;

      await supabase.rpc('create_notification', {
        p_user_id: studentId,
        p_title: 'Résultat de Soutenance',
        p_message: notificationMessage,
        p_type: decision === 'approved' ? 'success' : decision === 'corrections_required' ? 'warning' : 'error',
        p_entity_type: 'jury_decision',
        p_entity_id: themeId,
      });

      toast.success('Notation enregistrée avec succès');
      onGraded?.();
    } catch (error) {
      console.error('Error submitting grading:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Notation et Décision du Jury
        </CardTitle>
        <CardDescription>
          Enregistrez la décision finale et la note attribuée
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="decision">Décision *</Label>
          <Select value={decision} onValueChange={(v: any) => setDecision(v)}>
            <SelectTrigger id="decision">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">Approuvé</SelectItem>
              <SelectItem value="corrections_required">Corrections Requises</SelectItem>
              <SelectItem value="rejected">Rejeté</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="grade">Note sur 20 *</Label>
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
            <Label htmlFor="mention">Mention (optionnel)</Label>
            <Select value={mention} onValueChange={setMention}>
              <SelectTrigger id="mention">
                <SelectValue placeholder="Sélectionner une mention" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucune</SelectItem>
                <SelectItem value="Passable">Passable</SelectItem>
                <SelectItem value="Assez Bien">Assez Bien</SelectItem>
                <SelectItem value="Bien">Bien</SelectItem>
                <SelectItem value="Très Bien">Très Bien</SelectItem>
                <SelectItem value="Excellent">Excellent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="corrections"
              checked={correctionsRequired}
              onCheckedChange={(checked) => setCorrectionsRequired(checked as boolean)}
            />
            <Label htmlFor="corrections" className="cursor-pointer">
              Des corrections sont requises
            </Label>
          </div>

          {correctionsRequired && (
            <>
              <div className="space-y-2">
                <Label htmlFor="corrections-desc">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  Description des corrections *
                </Label>
                <Textarea
                  id="corrections-desc"
                  value={correctionsDescription}
                  onChange={(e) => setCorrectionsDescription(e.target.value)}
                  placeholder="Décrivez les corrections à apporter..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="corrections-deadline">Date limite (optionnel)</Label>
                <Input
                  id="corrections-deadline"
                  type="date"
                  value={correctionsDeadline}
                  onChange={(e) => setCorrectionsDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes de délibération (optionnel)</Label>
          <Textarea
            id="notes"
            value={deliberationNotes}
            onChange={(e) => setDeliberationNotes(e.target.value)}
            placeholder="Commentaires du jury, points forts, points à améliorer..."
            rows={4}
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full"
              disabled={loading || !grade}
            >
              <Save className="mr-2 h-4 w-4" />
              Enregistrer la Notation
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la Notation</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-2 text-left">
                  <p>Vous êtes sur le point d'enregistrer :</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Décision: <strong>{decision === 'approved' ? 'Approuvé' : decision === 'corrections_required' ? 'Corrections Requises' : 'Rejeté'}</strong></li>
                    <li>Note: <strong>{grade}/20</strong></li>
                    {mention && <li>Mention: <strong>{mention}</strong></li>}
                    {correctionsRequired && <li className="text-orange-600">Corrections requises</li>}
                  </ul>
                  <p className="text-sm text-gray-600 mt-3">
                    L'étudiant sera notifié de cette décision.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit}>
                Confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
