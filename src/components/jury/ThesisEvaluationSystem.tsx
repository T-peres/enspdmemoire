import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Theme, Document, JuryDecisionData } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  User,
  GraduationCap,
  Star,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface ThesisEvaluationSystemProps {
  themeId: string;
}

interface EvaluationForm {
  decision: 'approved' | 'corrections_required' | 'rejected';
  grade?: number;
  mention?: string;
  corrections_required: boolean;
  corrections_deadline?: string;
  corrections_description?: string;
  deliberation_notes?: string;
}

export function ThesisEvaluationSystem({ themeId }: ThesisEvaluationSystemProps) {
  const { profile } = useAuth();
  const [theme, setTheme] = useState<Theme | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [existingDecision, setExistingDecision] = useState<JuryDecisionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);

  const [evaluationForm, setEvaluationForm] = useState<EvaluationForm>({
    decision: 'approved',
    corrections_required: false,
    deliberation_notes: ''
  });

  useEffect(() => {
    fetchThemeData();
  }, [themeId]);

  const fetchThemeData = async () => {
    try {
      // Récupérer le thème
      const { data: themeData, error: themeError } = await supabase
        .from('themes')
        .select(`
          *,
          student:profiles!themes_student_id_fkey(*),
          supervisor:profiles!themes_supervisor_id_fkey(*)
        `)
        .eq('id', themeId)
        .single();

      if (themeError) throw themeError;
      setTheme(themeData);

      // Récupérer les documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('theme_id', themeId)
        .order('created_at', { ascending: false });

      if (documentsError) throw documentsError;
      setDocuments(documentsData || []);

      // Récupérer la décision existante
      const { data: decisionData, error: decisionError } = await supabase
        .from('jury_decisions')
        .select('*')
        .eq('theme_id', themeId)
        .single();

      if (!decisionError && decisionData) {
        setExistingDecision(decisionData);
        setEvaluationForm({
          decision: decisionData.decision as any,
          grade: decisionData.grade || undefined,
          mention: decisionData.mention || undefined,
          corrections_required: decisionData.corrections_required,
          corrections_deadline: decisionData.corrections_deadline || undefined,
          corrections_description: decisionData.corrections_description || undefined,
          deliberation_notes: decisionData.deliberation_notes || ''
        });
      }
    } catch (error) {
      console.error('Error fetching theme data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const submitEvaluation = async () => {
    if (!evaluationForm.decision) {
      toast.error('Veuillez sélectionner une décision');
      return;
    }

    if (evaluationForm.decision === 'approved' && !evaluationForm.grade) {
      toast.error('Veuillez saisir une note pour l\'approbation');
      return;
    }

    if (evaluationForm.corrections_required && !evaluationForm.corrections_description) {
      toast.error('Veuillez décrire les corrections requises');
      return;
    }

    setSubmitting(true);
    try {
      const evaluationData = {
        theme_id: themeId,
        student_id: theme?.student_id,
        decision: evaluationForm.decision,
        grade: evaluationForm.grade,
        mention: evaluationForm.mention,
        corrections_required: evaluationForm.corrections_required,
        corrections_deadline: evaluationForm.corrections_deadline,
        corrections_description: evaluationForm.corrections_description,
        deliberation_notes: evaluationForm.deliberation_notes,
        decided_at: new Date().toISOString()
      };

      let error;
      if (existingDecision) {
        // Mise à jour
        const result = await supabase
          .from('jury_decisions')
          .update(evaluationData)
          .eq('id', existingDecision.id);
        error = result.error;
      } else {
        // Création
        const result = await supabase
          .from('jury_decisions')
          .insert(evaluationData);
        error = result.error;
      }

      if (error) throw error;

      // Créer une notification pour l'étudiant
      await supabase.rpc('create_notification', {
        p_user_id: theme?.student_id,
        p_title: 'Évaluation de votre mémoire',
        p_message: `Votre mémoire "${theme?.title}" a été évalué par le jury. Décision: ${
          evaluationForm.decision === 'approved' ? 'Approuvé' :
          evaluationForm.decision === 'corrections_required' ? 'Corrections requises' :
          'Rejeté'
        }`,
        p_type: evaluationForm.decision === 'approved' ? 'success' : 
               evaluationForm.decision === 'corrections_required' ? 'warning' : 'error',
        p_entity_type: 'jury_decision',
        p_entity_id: themeId
      });

      // Notification pour l'encadreur
      if (theme?.supervisor_id) {
        await supabase.rpc('create_notification', {
          p_user_id: theme.supervisor_id,
          p_title: 'Évaluation d\'un mémoire que vous encadrez',
          p_message: `Le mémoire "${theme.title}" de ${theme.student?.first_name} ${theme.student?.last_name} a été évalué`,
          p_type: 'info',
          p_entity_type: 'jury_decision',
          p_entity_id: themeId
        });
      }

      toast.success('Évaluation enregistrée avec succès');
      setShowEvaluationDialog(false);
      fetchThemeData();
    } catch (error: any) {
      console.error('Error submitting evaluation:', error);
      toast.error(`Erreur lors de l'enregistrement: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approuvé</Badge>;
      case 'corrections_required':
        return <Badge className="bg-yellow-100 text-yellow-800">Corrections requises</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejeté</Badge>;
      default:
        return <Badge variant="outline">En attente</Badge>;
    }
  };

  const getMentionBadge = (mention: string) => {
    const colors: Record<string, string> = {
      'Passable': 'bg-gray-100 text-gray-800',
      'Assez Bien': 'bg-blue-100 text-blue-800',
      'Bien': 'bg-green-100 text-green-800',
      'Très Bien': 'bg-purple-100 text-purple-800',
      'Excellent': 'bg-yellow-100 text-yellow-800'
    };
    return <Badge className={colors[mention] || 'bg-gray-100 text-gray-800'}>{mention}</Badge>;
  };

  const downloadDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.title;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!theme) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Thème non trouvé
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête du thème */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{theme.title}</CardTitle>
              <CardDescription className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Étudiant: {theme.student?.first_name} {theme.student?.last_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>Encadreur: {theme.supervisor?.first_name} {theme.supervisor?.last_name}</span>
                </div>
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              {existingDecision && getDecisionBadge(existingDecision.decision)}
              {existingDecision?.grade && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{existingDecision.grade}/20</span>
                </div>
              )}
              {existingDecision?.mention && getMentionBadge(existingDecision.mention)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-gray-600">{theme.description}</p>
            </div>
            {theme.objectives && (
              <div>
                <h4 className="font-medium mb-2">Objectifs</h4>
                <p className="text-gray-600">{theme.objectives}</p>
              </div>
            )}
            {theme.methodology && (
              <div>
                <h4 className="font-medium mb-2">Méthodologie</h4>
                <p className="text-gray-600">{theme.methodology}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents du Mémoire
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              Aucun document disponible
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map(document => (
                <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <h4 className="font-medium">{document.title}</h4>
                      <p className="text-sm text-gray-600">
                        Type: {document.document_type} • 
                        Soumis le {new Date(document.submitted_at).toLocaleDateString('fr-FR')}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {document.status === 'submitted' && 'Soumis'}
                        {document.status === 'under_review' && 'En révision'}
                        {document.status === 'approved' && 'Approuvé'}
                        {document.status === 'rejected' && 'Rejeté'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDocument(document)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Évaluation existante */}
      {existingDecision && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Évaluation du Jury
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Décision</Label>
                  <div className="mt-1">
                    {getDecisionBadge(existingDecision.decision)}
                  </div>
                </div>
                {existingDecision.grade && (
                  <div>
                    <Label>Note</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium text-lg">{existingDecision.grade}/20</span>
                    </div>
                  </div>
                )}
                {existingDecision.mention && (
                  <div>
                    <Label>Mention</Label>
                    <div className="mt-1">
                      {getMentionBadge(existingDecision.mention)}
                    </div>
                  </div>
                )}
              </div>

              {existingDecision.corrections_required && (
                <div>
                  <Label>Corrections requises</Label>
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm">{existingDecision.corrections_description}</p>
                    {existingDecision.corrections_deadline && (
                      <p className="text-xs text-gray-600 mt-2">
                        Échéance: {new Date(existingDecision.corrections_deadline).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {existingDecision.deliberation_notes && (
                <div>
                  <Label>Notes de délibération</Label>
                  <div className="mt-2 p-3 bg-gray-50 border rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{existingDecision.deliberation_notes}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Dialog open={showEvaluationDialog} onOpenChange={setShowEvaluationDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
              <MessageSquare className="h-4 w-4 mr-2" />
              {existingDecision ? 'Modifier l\'évaluation' : 'Évaluer le mémoire'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Évaluation du Mémoire</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Décision */}
              <div>
                <Label>Décision *</Label>
                <Select 
                  value={evaluationForm.decision} 
                  onValueChange={(value) => setEvaluationForm(prev => ({ 
                    ...prev, 
                    decision: value as any,
                    corrections_required: value === 'corrections_required'
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Approuvé
                      </div>
                    </SelectItem>
                    <SelectItem value="corrections_required">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Corrections requises
                      </div>
                    </SelectItem>
                    <SelectItem value="rejected">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Rejeté
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Note et mention (si approuvé) */}
              {evaluationForm.decision === 'approved' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Note sur 20 *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="20"
                      step="0.25"
                      value={evaluationForm.grade || ''}
                      onChange={(e) => setEvaluationForm(prev => ({ 
                        ...prev, 
                        grade: parseFloat(e.target.value) || undefined 
                      }))}
                      placeholder="Ex: 15.5"
                    />
                  </div>
                  <div>
                    <Label>Mention</Label>
                    <Select 
                      value={evaluationForm.mention || ''} 
                      onValueChange={(value) => setEvaluationForm(prev => ({ 
                        ...prev, 
                        mention: value || undefined 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une mention" />
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
              )}

              {/* Corrections requises */}
              {evaluationForm.corrections_required && (
                <div className="space-y-4">
                  <div>
                    <Label>Description des corrections *</Label>
                    <Textarea
                      value={evaluationForm.corrections_description || ''}
                      onChange={(e) => setEvaluationForm(prev => ({ 
                        ...prev, 
                        corrections_description: e.target.value 
                      }))}
                      placeholder="Décrivez les corrections à apporter..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Échéance pour les corrections</Label>
                    <Input
                      type="date"
                      value={evaluationForm.corrections_deadline || ''}
                      onChange={(e) => setEvaluationForm(prev => ({ 
                        ...prev, 
                        corrections_deadline: e.target.value 
                      }))}
                    />
                  </div>
                </div>
              )}

              {/* Notes de délibération */}
              <div>
                <Label>Notes de délibération</Label>
                <Textarea
                  value={evaluationForm.deliberation_notes || ''}
                  onChange={(e) => setEvaluationForm(prev => ({ 
                    ...prev, 
                    deliberation_notes: e.target.value 
                  }))}
                  placeholder="Notes internes du jury..."
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEvaluationDialog(false)}
                >
                  Annuler
                </Button>
                <Button 
                  onClick={submitEvaluation}
                  disabled={submitting}
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer l\'évaluation'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}