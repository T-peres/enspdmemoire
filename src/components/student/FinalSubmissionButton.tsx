import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CheckCircle, Send, AlertTriangle } from 'lucide-react';

interface FinalSubmissionButtonProps {
  themeId: string;
  documentId: string;
  onSubmitted?: () => void;
}

/**
 * Bouton de soumission finale du mémoire
 * Vérifie que tous les chapitres sont validés avant de permettre la soumission
 */
export function FinalSubmissionButton({ themeId, documentId, onSubmitted }: FinalSubmissionButtonProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState<boolean | null>(null);
  const [missingItems, setMissingItems] = useState<string[]>([]);

  const checkSubmissionEligibility = async () => {
    if (!profile) return false;
    
    try {
      // Utiliser la fonction RPC pour vérifier l'éligibilité
      const { data, error } = await supabase.rpc('can_submit_final_report', {
        p_student_id: profile.id,
        p_theme_id: themeId,
      });

      if (error) throw error;

      const result = data as any;
      setMissingItems(result.errors || []);
      setCanSubmit(result.can_submit);

      return result.can_submit;
    } catch (error) {
      console.error('Error checking eligibility:', error);
      toast.error('Erreur lors de la vérification');
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;

    const eligible = await checkSubmissionEligibility();
    if (!eligible) return;

    setLoading(true);

    try {
      // Marquer le document comme soumission finale
      const { error: docError } = await supabase
        .from('documents')
        .update({
          status: 'under_review',
          is_final_submission: true,
          final_submitted_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (docError) throw docError;

      // Notifier l'encadreur
      const { data: theme } = await supabase
        .from('themes')
        .select('supervisor_id')
        .eq('id', themeId)
        .single();

      if (theme?.supervisor_id) {
        await supabase.rpc('create_notification', {
          p_user_id: theme.supervisor_id,
          p_title: 'Version Finale Soumise',
          p_message: `${profile.first_name} ${profile.last_name} a soumis sa version finale pour validation.`,
          p_type: 'info',
          p_entity_type: 'document',
          p_entity_id: documentId,
        });
      }

      toast.success('Version finale soumise avec succès !');
      onSubmitted?.();
    } catch (error) {
      console.error('Error submitting final version:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Soumission Finale
        </CardTitle>
        <CardDescription>
          Soumettez votre version finale pour validation et contrôle de plagiat
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              className="w-full" 
              size="lg"
              onClick={checkSubmissionEligibility}
              disabled={loading}
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Soumettre la Version Finale
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {canSubmit ? 'Confirmer la Soumission Finale' : 'Soumission Impossible'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {canSubmit ? (
                  <div className="space-y-2">
                    <p>Vous êtes sur le point de soumettre votre version finale.</p>
                    <p className="font-semibold">Cette action déclenchera :</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Validation par votre encadreur</li>
                      <li>Contrôle de plagiat automatique</li>
                      <li>Préparation pour la soutenance</li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-orange-600">
                      <AlertTriangle className="h-5 w-5 mt-0.5" />
                      <div>
                        <p className="font-semibold">Éléments manquants :</p>
                        <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                          {missingItems.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              {canSubmit && (
                <AlertDialogAction onClick={handleSubmit} disabled={loading}>
                  Confirmer la Soumission
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
