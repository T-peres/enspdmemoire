import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SafeSelect } from '@/components/ui/SafeSelect';
import { COMMON_OPTIONS } from '@/utils/selectHelpers';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Star,
  MessageSquare,
  Calendar,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ThesisSubmission {
  id: string;
  student_id: string;
  student_name: string;
  student_matricule: string;
  department_name: string;
  thesis_title: string;
  document_url: string;
  submitted_at: string;
  supervisor_name: string;
  current_status: 'pending' | 'under_review' | 'approved' | 'corrections_required' | 'rejected';
  plagiarism_score?: number;
  plagiarism_status: 'passed' | 'failed' | 'pending';
  jury_assignment_id?: string;
  previous_evaluations?: any[];
}

interface JuryEvaluation {
  thesis_submission_id: string;
  technical_quality: number;
  methodology: number;
  innovation: number;
  presentation: number;
  overall_grade: number;
  comments: string;
  decision: 'approved' | 'corrections_required' | 'rejected';
  corrections_deadline?: string;
}

interface JuryValidationWorkspaceProps {
  juryId: string;
}

export function JuryValidationWorkspace({ juryId }: JuryValidationWorkspaceProps) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<ThesisSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<ThesisSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');
  
  const [evaluation, setEvaluation] = useState<JuryEvaluation>({
    thesis_submission_id: '',
    technical_quality: 0,
    methodology: 0,
    innovation: 0,
    presentation: 0,
    overall_grade: 0,
    comments: '',
    decision: 'approved',
  });

  useEffect(() => {
    fetchAssignedSubmissions();
  }, [juryId]);

  useEffect(() => {
    if (selectedSubmission) {
      setEvaluation(prev => ({
        ...prev,
        thesis_submission_id: selectedSubmission.id,
      }));
    }
  }, [selectedSubmission]);

  const fetchAssignedSubmissions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_jury_assigned_submissions', {
        p_jury_id: juryId
      });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error: any) {
      console.error('Error fetching submissions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les mémoires assignés',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallGrade = () => {
    const { technical_quality, methodology, innovation, presentation } = evaluation;
    const average = (technical_quality + methodology + innovation + presentation) / 4;
    setEvaluation(prev => ({ ...prev, overall_grade: Math.round(average * 100) / 100 }));
  };

  useEffect(() => {
    calculateOverallGrade();
  }, [evaluation.technical_quality, evaluation.methodology, evaluation.innovation, evaluation.presentation]);

  const submitEvaluation = async () => {
    if (!selectedSubmission) return;

    // Validation
    if (evaluation.overall_grade < 0 || evaluation.overall_grade > 20) {
      toast({
        title: 'Erreur',
        description: 'La note doit être entre 0 et 20',
        variant: 'destructive',
      });
      return;
    }

    if (!evaluation.comments.trim()) {
      toast({
        title: 'Erreur',
        description: 'Les commentaires sont obligatoires',
        variant: 'destructive',
      });
      return;
    }

    setEvaluating(true);

    try {
      const { error } = await supabase.rpc('submit_jury_evaluation', {
        p_jury_id: juryId,
        p_submission_id: selectedSubmission.id,
        p_evaluation: evaluation
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Évaluation soumise avec succès',
      });

      // Rafraîchir les données
      await fetchAssignedSubmissions();
      setSelectedSubmission(null);
      
      // Réinitialiser le formulaire
      setEvaluation({
        thesis_submission_id: '',
        technical_quality: 0,
        methodology: 0,
        innovation: 0,
        presentation: 0,
        overall_grade: 0,
        comments: '',
        decision: 'approved',
      });

    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la soumission',
        variant: 'destructive',
      });
    } finally {
      setEvaluating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'under_review':
        return <Badge variant="default">En cours</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approuvé</Badge>;
      case 'corrections_required':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Corrections</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlagiarismBadge = (status: string, score?: number) => {
    switch (status) {
      case 'passed':
        return <Badge variant="default" className="bg-green-100 text-green-800">
          Validé {score && `(${score}%)`}
        </Badge>;
      case 'failed':
        return <Badge variant="destructive">
          Échec {score && `(${score}%)`}
        </Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      default:
        return <Badge variant="outline">Non testé</Badge>;
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    switch (filter) {
      case 'pending':
        return submission.current_status === 'pending' || submission.current_status === 'under_review';
      case 'reviewed':
        return ['approved', 'corrections_required', 'rejected'].includes(submission.current_status);
      default:
        return true;
    }
  });

  const pendingCount = submissions.filter(s => s.current_status === 'pending' || s.current_status === 'under_review').length;
  const reviewedCount = submissions.filter(s => ['approved', 'corrections_required', 'rejected'].includes(s.current_status)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Validation des Mémoires</h1>
        <p className="text-muted-foreground mt-2">
          Évaluez et validez les mémoires qui vous sont assignés
        </p>
      </div>

      <Tabs value={selectedSubmission ? 'evaluation' : 'list'} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="list" 
            onClick={() => setSelectedSubmission(null)}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Liste des Mémoires
          </TabsTrigger>
          <TabsTrigger 
            value="evaluation" 
            disabled={!selectedSubmission}
            className="flex items-center gap-2"
          >
            <Star className="h-4 w-4" />
            Évaluation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Mémoires Assignés</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilter('all')}
                    className={filter === 'all' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    Tous ({submissions.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilter('pending')}
                    className={filter === 'pending' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    À évaluer ({pendingCount})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilter('reviewed')}
                    className={filter === 'reviewed' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    Évalués ({reviewedCount})
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun mémoire {filter === 'pending' ? 'à évaluer' : filter === 'reviewed' ? 'évalué' : 'assigné'}</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {filteredSubmissions.map((submission) => (
                      <Card key={submission.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{submission.thesis_title}</h3>
                                {getStatusBadge(submission.current_status)}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  {submission.student_name} ({submission.student_matricule})
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Soumis {formatDistanceToNow(new Date(submission.submitted_at), { 
                                    addSuffix: true, 
                                    locale: fr 
                                  })}
                                </div>
                                <div>
                                  <strong>Département:</strong> {submission.department_name}
                                </div>
                                <div>
                                  <strong>Encadreur:</strong> {submission.supervisor_name}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Anti-plagiat:</span>
                                  {getPlagiarismBadge(submission.plagiarism_status, submission.plagiarism_score)}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(submission.document_url, '_blank')}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Consulter
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = submission.document_url;
                                    link.download = `${submission.student_name}_memoire.pdf`;
                                    link.click();
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Télécharger
                                </Button>
                                
                                {(submission.current_status === 'pending' || submission.current_status === 'under_review') && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => setSelectedSubmission(submission)}
                                  >
                                    <Star className="h-4 w-4 mr-2" />
                                    Évaluer
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluation" className="space-y-4">
          {selectedSubmission && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informations du mémoire */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations du Mémoire</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="font-semibold">Titre</Label>
                    <p className="text-sm mt-1">{selectedSubmission.thesis_title}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold">Étudiant</Label>
                      <p className="text-sm mt-1">{selectedSubmission.student_name}</p>
                      <p className="text-xs text-muted-foreground">{selectedSubmission.student_matricule}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Encadreur</Label>
                      <p className="text-sm mt-1">{selectedSubmission.supervisor_name}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="font-semibold">Département</Label>
                    <p className="text-sm mt-1">{selectedSubmission.department_name}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedSubmission.document_url, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Consulter le Document
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Formulaire d'évaluation */}
              <Card>
                <CardHeader>
                  <CardTitle>Grille d'Évaluation</CardTitle>
                  <CardDescription>
                    Évaluez chaque critère sur 20 points
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="technical_quality">Qualité Technique</Label>
                      <Input
                        id="technical_quality"
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={evaluation.technical_quality}
                        onChange={(e) => setEvaluation(prev => ({
                          ...prev,
                          technical_quality: parseFloat(e.target.value) || 0
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="methodology">Méthodologie</Label>
                      <Input
                        id="methodology"
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={evaluation.methodology}
                        onChange={(e) => setEvaluation(prev => ({
                          ...prev,
                          methodology: parseFloat(e.target.value) || 0
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="innovation">Innovation</Label>
                      <Input
                        id="innovation"
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={evaluation.innovation}
                        onChange={(e) => setEvaluation(prev => ({
                          ...prev,
                          innovation: parseFloat(e.target.value) || 0
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="presentation">Présentation</Label>
                      <Input
                        id="presentation"
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={evaluation.presentation}
                        onChange={(e) => setEvaluation(prev => ({
                          ...prev,
                          presentation: parseFloat(e.target.value) || 0
                        }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Note Globale (Calculée)</Label>
                    <div className="text-2xl font-bold text-primary">
                      {evaluation.overall_grade.toFixed(1)} / 20
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="decision">Décision</Label>
                    <SafeSelect
                      value={evaluation.decision}
                      onValueChange={(value) => setEvaluation(prev => ({
                        ...prev,
                        decision: value as any
                      }))}
                      options={COMMON_OPTIONS.JURY_DECISIONS}
                    />
                  </div>
                  
                  {evaluation.decision === 'corrections_required' && (
                    <div className="space-y-2">
                      <Label htmlFor="corrections_deadline">Délai pour Corrections</Label>
                      <Input
                        id="corrections_deadline"
                        type="date"
                        value={evaluation.corrections_deadline || ''}
                        onChange={(e) => setEvaluation(prev => ({
                          ...prev,
                          corrections_deadline: e.target.value
                        }))}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="comments">Commentaires et Observations *</Label>
                    <Textarea
                      id="comments"
                      rows={4}
                      value={evaluation.comments}
                      onChange={(e) => setEvaluation(prev => ({
                        ...prev,
                        comments: e.target.value
                      }))}
                      placeholder="Détaillez votre évaluation, les points forts, les améliorations suggérées..."
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 pt-4">
                    <Button
                      onClick={submitEvaluation}
                      disabled={evaluating || !evaluation.comments.trim()}
                      className="flex-1"
                    >
                      {evaluating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Soumission...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Soumettre l'Évaluation
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setSelectedSubmission(null)}
                    >
                      Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}