import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Theme, ThemeStatus } from '@/types/database';
import { toast } from 'sonner';
import { CheckCircle, XCircle, FileText, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ThemeWithDetails extends Theme {
  student?: {
    first_name: string;
    last_name: string;
    student_id: string;
  };
  supervisor?: {
    first_name: string;
    last_name: string;
  };
}

/**
 * Workflow d'approbation des thèmes pour le chef de département
 * Gère la validation, le rejet et les demandes de révision des thèmes
 */
export function ThemeApprovalWorkflow() {
  const { profile } = useAuth();
  const [themes, setThemes] = useState<ThemeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<ThemeWithDetails | null>(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (profile?.department_id) {
      loadThemes();
    }
  }, [profile]);

  const loadThemes = async () => {
    try {
      const { data, error } = await supabase
        .from('themes')
        .select(`
          *,
          student:profiles!themes_student_id_fkey(first_name, last_name, student_id),
          supervisor:profiles!themes_supervisor_id_fkey(first_name, last_name)
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true });

      if (error) throw error;
      setThemes(data || []);
    } catch (error) {
      console.error('Error loading themes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (themeId: string) => {
    if (!profile) return;
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('themes')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
        })
        .eq('id', themeId);

      if (error) throw error;

      // Notifier l'étudiant
      const theme = themes.find(t => t.id === themeId);
      if (theme) {
        await supabase.rpc('create_notification', {
          p_user_id: theme.student_id,
          p_title: 'Thème Approuvé',
          p_message: 'Votre thème de mémoire a été approuvé par le chef de département.',
          p_type: 'success',
          p_entity_type: 'theme',
          p_entity_id: themeId,
        });
      }

      toast.success('Thème approuvé avec succès');
      loadThemes();
    } catch (error) {
      console.error('Error approving theme:', error);
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (themeId: string, reason: string) => {
    if (!profile || !reason.trim()) {
      toast.error('Veuillez fournir une raison pour le rejet');
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from('themes')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
          rejection_reason: reason,
        })
        .eq('id', themeId);

      if (error) throw error;

      // Notifier l'étudiant
      const theme = themes.find(t => t.id === themeId);
      if (theme) {
        await supabase.rpc('create_notification', {
          p_user_id: theme.student_id,
          p_title: 'Thème Rejeté',
          p_message: 'Votre thème de mémoire a été rejeté. Consultez les commentaires.',
          p_type: 'error',
          p_entity_type: 'theme',
          p_entity_id: themeId,
        });
      }

      toast.info('Thème rejeté');
      setFeedback('');
      loadThemes();
    } catch (error) {
      console.error('Error rejecting theme:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestRevision = async (themeId: string, notes: string) => {
    if (!profile || !notes.trim()) {
      toast.error('Veuillez fournir des notes de révision');
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from('themes')
        .update({
          status: 'revision_requested',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
          revision_notes: notes,
        })
        .eq('id', themeId);

      if (error) throw error;

      // Notifier l'étudiant
      const theme = themes.find(t => t.id === themeId);
      if (theme) {
        await supabase.rpc('create_notification', {
          p_user_id: theme.student_id,
          p_title: 'Révision Demandée',
          p_message: 'Des révisions sont demandées sur votre thème de mémoire.',
          p_type: 'warning',
          p_entity_type: 'theme',
          p_entity_id: themeId,
        });
      }

      toast.info('Révision demandée');
      setFeedback('');
      loadThemes();
    } catch (error) {
      console.error('Error requesting revision:', error);
      toast.error('Erreur lors de la demande de révision');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: ThemeStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50">En attente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50">Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50">Rejeté</Badge>;
      case 'revision_requested':
        return <Badge variant="outline" className="bg-orange-50">Révision demandée</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approbation des Thèmes</CardTitle>
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
          <FileText className="h-5 w-5" />
          Approbation des Thèmes
        </CardTitle>
        <CardDescription>
          {themes.length} thème{themes.length > 1 ? 's' : ''} en attente de validation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {themes.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Aucun thème en attente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {themes.map((theme) => (
              <div key={theme.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-1">{theme.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span>
                        Étudiant: {theme.student?.first_name} {theme.student?.last_name}
                        {theme.student?.student_id && ` (${theme.student.student_id})`}
                      </span>
                      {theme.supervisor && (
                        <span>
                          Encadreur: {theme.supervisor.first_name} {theme.supervisor.last_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      Soumis le {format(new Date(theme.submitted_at), 'PPP', { locale: fr })}
                    </div>
                  </div>
                  {getStatusBadge(theme.status)}
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <Label className="text-sm font-semibold">Description</Label>
                    <p className="text-sm text-gray-700 mt-1">{theme.description}</p>
                  </div>

                  {theme.objectives && (
                    <div>
                      <Label className="text-sm font-semibold">Objectifs</Label>
                      <p className="text-sm text-gray-700 mt-1">{theme.objectives}</p>
                    </div>
                  )}

                  {theme.methodology && (
                    <div>
                      <Label className="text-sm font-semibold">Méthodologie</Label>
                      <p className="text-sm text-gray-700 mt-1">{theme.methodology}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`feedback-${theme.id}`}>
                      Commentaires / Notes de révision
                    </Label>
                    <Textarea
                      id={`feedback-${theme.id}`}
                      value={selectedTheme?.id === theme.id ? feedback : ''}
                      onChange={(e) => {
                        setSelectedTheme(theme);
                        setFeedback(e.target.value);
                      }}
                      placeholder="Ajoutez vos commentaires..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="default"
                          className="flex-1"
                          disabled={processing}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approuver
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approuver ce thème ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            L'étudiant pourra commencer à travailler sur son mémoire.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleApprove(theme.id)}>
                            Confirmer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={processing || !feedback.trim() || selectedTheme?.id !== theme.id}
                      onClick={() => handleRequestRevision(theme.id, feedback)}
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Demander Révision
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          disabled={processing || !feedback.trim() || selectedTheme?.id !== theme.id}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Rejeter
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rejeter ce thème ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est définitive. L'étudiant devra soumettre un nouveau thème.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleReject(theme.id, feedback)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Confirmer le Rejet
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
