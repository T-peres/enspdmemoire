import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Theme, Document, FicheSuivi, PlagiarismReport } from '@/types/database';
import { FileText, Download, CheckCircle, AlertCircle, Star } from 'lucide-react';
import { toast } from 'sonner';

interface ThesisViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: Theme;
}

export function ThesisViewDialog({ open, onOpenChange, theme }: ThesisViewDialogProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [fiche, setFiche] = useState<FicheSuivi | null>(null);
  const [plagiarismReport, setPlagiarismReport] = useState<PlagiarismReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && theme) {
      fetchData();
    }
  }, [open, theme]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Récupérer les documents
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('theme_id', theme.id)
        .order('created_at', { ascending: true });

      if (docsError) throw docsError;
      setDocuments(docsData || []);

      // Récupérer la fiche de suivi
      const { data: ficheData, error: ficheError } = await supabase
        .from('fiche_suivi')
        .select('*')
        .eq('theme_id', theme.id)
        .single();

      if (ficheError && ficheError.code !== 'PGRST116') throw ficheError;
      setFiche(ficheData);

      // Récupérer le rapport de plagiat de la version finale
      const finalDoc = docsData?.find(d => d.document_type === 'final_version');
      if (finalDoc) {
        const { data: plagiarismData, error: plagiarismError } = await supabase
          .from('plagiarism_reports')
          .select('*')
          .eq('document_id', finalDoc.id)
          .single();

        if (plagiarismError && plagiarismError.code !== 'PGRST116') throw plagiarismError;
        setPlagiarismReport(plagiarismData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('thesis-documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.title;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Téléchargement démarré');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      plan: 'Plan',
      chapter_1: 'Chapitre 1',
      chapter_2: 'Chapitre 2',
      chapter_3: 'Chapitre 3',
      chapter_4: 'Chapitre 4',
      final_version: 'Version Finale',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      submitted: { variant: 'outline', label: 'Soumis' },
      under_review: { variant: 'outline', label: 'En examen' },
      approved: { variant: 'default', label: 'Approuvé' },
      rejected: { variant: 'destructive', label: 'Rejeté' },
      revision_requested: { variant: 'outline', label: 'Révision demandée' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{theme.title}</DialogTitle>
          <DialogDescription>
            Étudiant: {theme.student?.first_name} {theme.student?.last_name}
            <br />
            Encadreur: {theme.supervisor?.first_name} {theme.supervisor?.last_name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="fiche">Fiche de Suivi</TabsTrigger>
            <TabsTrigger value="plagiat">Plagiat</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Description du Thème</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{theme.description}</p>
                </div>
                {theme.objectives && (
                  <div>
                    <h4 className="font-medium mb-2">Objectifs</h4>
                    <p className="text-sm text-gray-600">{theme.objectives}</p>
                  </div>
                )}
                {theme.methodology && (
                  <div>
                    <h4 className="font-medium mb-2">Méthodologie</h4>
                    <p className="text-sm text-gray-600">{theme.methodology}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            {documents.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  Aucun document disponible
                </CardContent>
              </Card>
            ) : (
              documents.map((doc) => (
                <Card key={doc.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{getDocumentTypeLabel(doc.document_type)}</CardTitle>
                        <CardDescription>{doc.title}</CardDescription>
                      </div>
                      {getStatusBadge(doc.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Version {doc.version} • Soumis le {new Date(doc.submitted_at).toLocaleDateString('fr-FR')}
                      </div>
                      <Button onClick={() => handleDownload(doc)} size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    </div>
                    {doc.feedback && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium mb-1">Feedback de l'encadreur:</p>
                        <p className="text-sm text-gray-600">{doc.feedback}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="fiche" className="space-y-4">
            {!fiche ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  Aucune fiche de suivi disponible
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Progression Globale</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Progression</span>
                          <span className="text-sm font-medium">{fiche.overall_progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${fiche.overall_progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Qualité</p>
                          {fiche.quality_rating ? renderStars(fiche.quality_rating) : <span className="text-sm text-gray-400">Non évalué</span>}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Méthodologie</p>
                          {fiche.methodology_rating ? renderStars(fiche.methodology_rating) : <span className="text-sm text-gray-400">Non évalué</span>}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Rédaction</p>
                          {fiche.writing_quality_rating ? renderStars(fiche.writing_quality_rating) : <span className="text-sm text-gray-400">Non évalué</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Détails par Chapitre</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Plan */}
                    <div className="border-b pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Plan</h4>
                        {fiche.plan_approved ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                        )}
                      </div>
                      {fiche.plan_comments && (
                        <p className="text-sm text-gray-600">{fiche.plan_comments}</p>
                      )}
                    </div>

                    {/* Chapitres */}
                    {[1, 2, 3, 4].map((chapter) => {
                      const progress = fiche[`chapter_${chapter}_progress` as keyof FicheSuivi] as number;
                      const comments = fiche[`chapter_${chapter}_comments` as keyof FicheSuivi] as string;
                      return (
                        <div key={chapter} className="border-b pb-4 last:border-b-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Chapitre {chapter}</h4>
                            <span className="text-sm font-medium">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          {comments && (
                            <p className="text-sm text-gray-600">{comments}</p>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Validations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Validation Encadreur</span>
                      {fiche.supervisor_validated ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Validé
                        </Badge>
                      ) : (
                        <Badge variant="outline">En attente</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Validation Chef de Département</span>
                      {fiche.department_head_validated ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Validé
                        </Badge>
                      ) : (
                        <Badge variant="outline">En attente</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="plagiat" className="space-y-4">
            {!plagiarismReport ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  Aucun rapport de plagiat disponible
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Rapport de Contrôle de Plagiat</CardTitle>
                  <CardDescription>
                    Vérifié le {plagiarismReport.checked_at ? new Date(plagiarismReport.checked_at).toLocaleDateString('fr-FR') : 'N/A'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Taux de Plagiat</p>
                      <p className="text-3xl font-bold">
                        {plagiarismReport.plagiarism_score?.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      {plagiarismReport.passed ? (
                        <Badge variant="default" className="bg-green-500 text-lg px-4 py-2">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          PASSÉ
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-lg px-4 py-2">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          ÉCHEC
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600 mb-1">Seuil utilisé</p>
                      <p className="text-lg font-medium">{plagiarismReport.threshold_used}%</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600 mb-1">Sources trouvées</p>
                      <p className="text-lg font-medium">{plagiarismReport.sources_found}</p>
                    </div>
                  </div>

                  {plagiarismReport.notes && (
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm font-medium mb-1">Notes</p>
                      <p className="text-sm text-gray-600">{plagiarismReport.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
