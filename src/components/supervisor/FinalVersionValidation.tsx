import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Document } from '@/types/database';
import { toast } from 'sonner';
import { CheckCircle, XCircle, FileCheck } from 'lucide-react';

interface FinalVersionValidationProps {
  document: Document;
  onValidated: () => void;
}

export function FinalVersionValidation({ document, onValidated }: FinalVersionValidationProps) {
  const { profile } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async (approved: boolean) => {
    if (!profile) return;

    setLoading(true);

    try {
      // Mettre à jour le statut du document
      const { error: docError } = await supabase
        .from('documents')
        .update({
          status: approved ? 'approved' : 'revision_requested',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
          feedback: feedback || null,
        })
        .eq('id', document.id);

      if (docError) throw docError;

      if (approved) {
        // Lancer le contrôle de plagiat automatiquement
        const { error: plagiarismError } = await supabase
          .from('plagiarism_reports')
          .insert({
            document_id: document.id,
            theme_id: document.theme_id,
            student_id: document.student_id,
            status: 'pending',
            threshold_used: 20.0,
          });

        if (plagiarismError) throw plagiarismError;

        // Notification à l'étudiant
        await supabase.rpc('create_notification', {
          p_user_id: document.student_id,
          p_title: 'Version Finale Validée',
          p_message: `Votre version finale a été validée par votre encadreur. Le contrôle de plagiat est en cours.`,
          p_type: 'success',
          p_entity_type: 'document',
          p_entity_id: document.id,
        });

        toast.success('Version finale validée ! Contrôle de plagiat lancé.');
      } else {
        // Notification à l'étudiant pour révision
        await supabase.rpc('create_notification', {
          p_user_id: document.student_id,
          p_title: 'Révision Demandée',
          p_message: `Votre encadreur demande des révisions sur la version finale.`,
          p_type: 'warning',
          p_entity_type: 'document',
          p_entity_id: document.id,
        });

        toast.info('Révision demandée. L\'étudiant a été notifié.');
      }

      onValidated();
    } catch (error) {
      console.error('Error validating final version:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  if (document.status === 'approved') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-900">Version Finale Validée</CardTitle>
          </div>
          <CardDescription>
            Validée le {new Date(document.reviewed_at!).toLocaleDateString('fr-FR')}
          </CardDescription>
        </CardHeader>
        {document.feedback && (
          <CardContent>
            <p className="text-sm text-gray-700">{document.feedback}</p>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-blue-600" />
          <CardTitle>Validation de la Version Finale</CardTitle>
        </div>
        <CardDescription>
          Validez la version finale pour lancer le contrôle de plagiat
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="feedback">Commentaires (optionnel)</Label>
          <Textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Ajoutez vos commentaires sur la version finale..."
            rows={4}
          />
        </div>

        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="flex-1" disabled={loading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Valider et Lancer le Contrôle de Plagiat
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Valider la Version Finale ?</AlertDialogTitle>
                <AlertDialogDescription>
                  En validant, vous confirmez que la version finale est prête pour le contrôle de plagiat.
                  Le système lancera automatiquement la vérification.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleValidate(true)}>
                  Valider
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex-1" disabled={loading}>
                <XCircle className="h-4 w-4 mr-2" />
                Demander des Révisions
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Demander des Révisions ?</AlertDialogTitle>
                <AlertDialogDescription>
                  L'étudiant devra soumettre une nouvelle version. Assurez-vous d'avoir ajouté des commentaires explicatifs.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleValidate(false)}>
                  Demander Révisions
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
