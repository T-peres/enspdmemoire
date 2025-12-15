import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Eye, 
  Download, 
  FileText, 
  Calendar, 
  Users,
  CheckCircle,
  XCircle,
  MessageSquare,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

interface JuryDocumentInterfaceProps {
  themeId?: string;
  studentId?: string;
  onDocumentAction?: () => void;
}

interface DefenseSession {
  id: string;
  student_id: string;
  student_name: string;
  theme_title: string;
  defense_date: string;
  status: string;
  final_document_id?: string;
}

interface Document {
  id: string;
  title: string;
  document_type: string;
  status: string;
  file_path: string;
  submitted_at: string;
  student_name: string;
  theme_title: string;
}

interface JuryEvaluation {
  defense_id: string;
  presentation_score: number;
  content_score: number;
  methodology_score: number;
  innovation_score: number;
  comments: string;
  recommendation: string;
}

export function JuryDocumentInterface({ onDocumentAction }: JuryDocumentInterfaceProps) {
  const { profile } = useAuth();
  const [defenses, setDefenses] = useState<DefenseSession[]>([]);
  const [finalDocuments, setFinalDocuments] = useState<Document[]>([]);
  const [selectedDefense, setSelectedDefense] = useState<DefenseSession | null>(null);
  const [evaluation, setEvaluation] = useState<JuryEvaluation>({
    defense_id: '',
    presentation_score: 0,
    content_score: 0,
    methodology_score: 0,
    innovation_score: 0,
    comments: '',
    recommendation: 'pending'
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scheduled');

  useEffect(() => {
    loadJuryData();
  }, []);

  const loadJuryData = async () => {
    if (!profile) return;

    try {
      // Charger les soutenances assignées au jury
      const { data: defensesData, error: defensesError } = await supabase
        .from('defense_sessions')
        .select(`
          id,
          student_id,
          defense_date,
          status,
          student:profiles!defense_sessions_student_id_fkey(
            first_name,
            last_name
          ),
          theme:thesis_topics!defense_sessions_student_id_fkey(
            title
          )
        `)
        .contains('jury_members', [profile.id])
        .order('defense_date', { ascending: true });

      if (defensesError) throw defensesError;

      const formattedDefenses = (defensesData || []).map(defense => ({
        id: defense.id,
        student_id: defense.student_id,
        student_name: `${defense.student?.first_name} ${defense.student?.last_name}`,
        theme_title: defense.theme?.title || 'Sujet non défini',
        defense_date: defense.defense_date,
        status: defense.status
      }));

      setDefenses(formattedDefenses);

      // Charger les documents finaux des étudiants en soutenance
      const studentIds = formattedDefenses.map(d => d.student_id);
      if (studentIds.length > 0) {
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select(`
            id,
            title,
            document_type,
            status,
            file_path,
            submitted_at,
            student_id,
            theme_id,
            student:profiles!documents_student_id_fkey(
              first_name,
              last_name
            ),
            theme:themes!documents_theme_id_fkey(
              title
            )
          `)
          .in('student_id', studentIds)
          .eq('document_type', 'final_version')
          .eq('status', 'approved');

        if (documentsError) throw documentsError;

        const formattedDocuments = (documentsData || []).map(doc => ({
          id: doc.id,
          title: doc.title,
          document_type: doc.document_type,
          status: doc.status,
          file_path: doc.file_path,
          submitted_at: doc.submitted_at,
          student_name: `${doc.student?.first_name} ${doc.student?.last_name}`,
          theme_title: doc.theme?.title || 'Sujet non défini'
        }));

        setFinalDocuments(formattedDocuments);
      }

    } catch (error) {
      console.error('Error loading jury data:', error);
      toast.error('Erreur lors du chargement des données du jury');
    } finally {
      setLoading(false);
    }
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
      a.download = `${document.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Document téléchargé');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const submitEvaluation = async () => {
    if (!selectedDefense) return;

    try {
      const { error } = await supabase
        .from('jury_evaluations')
        .upsert({
          defense_id: selectedDefense.id,
          jury_member_id: profile?.id,
          presentation_score: evaluation.presentation_score,
          content_score: evaluation.content_score,
          methodology_score: evaluation.methodology_score,
          innovation_score: evaluation.innovation_score,
          comments: evaluation.comments,
          recommendation: evaluation.recommendation,
          evaluated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Évaluation soumise avec succès');
      setSelectedDefense(null);
      setEvaluation({
        defense_id: '',
        presentation_score: 0,
        content_score: 0,
        methodology_score: 0,
        innovation_score: 0,
        comments: '',
        recommendation: 'pending'
      });
      onDocumentAction?.();
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error('Erreur lors de la soumission de l\'évaluation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <Badge variant="outline" className="border-blue-600 text-blue-600">Programmée</Badge>;
      case 'in_progress': return <Badge variant="outline" className="border-yellow-600 text-yellow-600">En cours</Badge>;
      case 'completed': return <Badge className="bg-green-600">Terminée</Badge>;
      case 'cancelled': return <Badge variant="destructive">Annulée</Badge>;
      default: return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'excellent': return <Badge className="bg-green-600">Excellent</Badge>;
      case 'good': return <Badge className="bg-blue-600">Bien</Badge>;
      case 'satisfactory': return <Badge variant="outline" className="border-yellow-600 text-yellow-600">Satisfaisant</Badge>;
      case 'needs_improvement': return <Badge variant="destructive">À améliorer</Badge>;
      default: return <Badge variant="secondary">En attente</Badge>;
    }
  };

  const filterDefenses = (status: string) => {
    switch (status) {
      case 'scheduled':
        return defenses.filter(d => d.status === 'scheduled');
      case 'completed':
        return defenses.filter(d => d.status === 'completed');
      case 'upcoming':
        return defenses.filter(d => 
          d.status === 'scheduled' && 
          new Date(d.defense_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );
      default:
        return defenses;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{filterDefenses('scheduled').length}</p>
                <p className="text-sm text-muted-foreground">Programmées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{filterDefenses('completed').length}</p>
                <p className="text-sm text-muted-foreground">Terminées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{finalDocuments.length}</p>
                <p className="text-sm text-muted-foreground">Documents finaux</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{filterDefenses('upcoming').length}</p>
                <p className="text-sm text-muted-foreground">Cette semaine</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scheduled">
            Soutenances programmées ({filterDefenses('scheduled').length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents finaux ({finalDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="evaluations">
            Mes évaluations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Soutenances Programmées
              </CardTitle>
              <CardDescription>
                Soutenances auxquelles vous participez en tant que membre du jury
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filterDefenses('scheduled').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune soutenance programmée
                </div>
              ) : (
                <div className="space-y-4">
                  {filterDefenses('scheduled').map((defense) => (
                    <div key={defense.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{defense.student_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {defense.theme_title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(defense.defense_date).toLocaleDateString('fr-FR')} à{' '}
                            {new Date(defense.defense_date).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(defense.status)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedDefense(defense)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Évaluer
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Évaluation de Soutenance</DialogTitle>
                              <DialogDescription>
                                {defense.student_name} - {defense.theme_title}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Présentation (/20)</Label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={evaluation.presentation_score}
                                    onChange={(e) => setEvaluation({
                                      ...evaluation,
                                      presentation_score: Number(e.target.value)
                                    })}
                                    className="w-full p-2 border rounded"
                                  />
                                </div>
                                
                                <div>
                                  <Label>Contenu (/20)</Label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={evaluation.content_score}
                                    onChange={(e) => setEvaluation({
                                      ...evaluation,
                                      content_score: Number(e.target.value)
                                    })}
                                    className="w-full p-2 border rounded"
                                  />
                                </div>
                                
                                <div>
                                  <Label>Méthodologie (/20)</Label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={evaluation.methodology_score}
                                    onChange={(e) => setEvaluation({
                                      ...evaluation,
                                      methodology_score: Number(e.target.value)
                                    })}
                                    className="w-full p-2 border rounded"
                                  />
                                </div>
                                
                                <div>
                                  <Label>Innovation (/20)</Label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={evaluation.innovation_score}
                                    onChange={(e) => setEvaluation({
                                      ...evaluation,
                                      innovation_score: Number(e.target.value)
                                    })}
                                    className="w-full p-2 border rounded"
                                  />
                                </div>
                              </div>

                              <div>
                                <Label>Recommandation</Label>
                                <select
                                  value={evaluation.recommendation}
                                  onChange={(e) => setEvaluation({
                                    ...evaluation,
                                    recommendation: e.target.value
                                  })}
                                  className="w-full p-2 border rounded"
                                >
                                  <option value="pending">En attente</option>
                                  <option value="excellent">Excellent</option>
                                  <option value="good">Bien</option>
                                  <option value="satisfactory">Satisfaisant</option>
                                  <option value="needs_improvement">À améliorer</option>
                                </select>
                              </div>

                              <div>
                                <Label>Commentaires</Label>
                                <Textarea
                                  value={evaluation.comments}
                                  onChange={(e) => setEvaluation({
                                    ...evaluation,
                                    comments: e.target.value
                                  })}
                                  placeholder="Vos commentaires et observations..."
                                  rows={4}
                                />
                              </div>

                              <Button onClick={submitEvaluation} className="w-full">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Soumettre l'évaluation
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents Finaux
              </CardTitle>
              <CardDescription>
                Documents finaux approuvés des étudiants en soutenance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {finalDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun document final disponible
                </div>
              ) : (
                <div className="space-y-4">
                  {finalDocuments.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {doc.student_name} • {doc.theme_title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Soumis le {new Date(doc.submitted_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <Badge className="bg-green-600">Approuvé</Badge>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(doc)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Mes Évaluations
              </CardTitle>
              <CardDescription>
                Historique de vos évaluations de soutenances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Fonctionnalité en cours de développement
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}