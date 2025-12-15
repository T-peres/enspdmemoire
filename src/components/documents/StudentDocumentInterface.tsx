import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  Download,
  Eye,
  MessageSquare
} from 'lucide-react';
import { DocumentUploadPanelWithValidation } from '@/components/student/DocumentUploadPanelWithValidation';
import { toast } from 'sonner';

interface StudentDocumentInterfaceProps {
  themeId?: string;
  onDocumentAction?: () => void;
}

interface Document {
  id: string;
  document_type: string;
  title: string;
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  feedback?: string;
  file_path: string;
  file_size: number;
}

interface DocumentStatus {
  next_allowed_document: string;
  overall_progress: number;
  plan_status?: string;
  chapter_1_status?: string;
  chapter_2_status?: string;
  chapter_3_status?: string;
  chapter_4_status?: string;
  final_version_status?: string;
  supervisor_name?: string;
  theme_title?: string;
}

export function StudentDocumentInterface({ themeId, onDocumentAction }: StudentDocumentInterfaceProps) {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upload');

  useEffect(() => {
    if (themeId) {
      loadDocuments();
      loadDocumentStatus();
    }
  }, [themeId]);

  const loadDocuments = async () => {
    if (!themeId || !profile) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('theme_id', themeId)
        .eq('student_id', profile.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Erreur lors du chargement des documents');
    }
  };

  const loadDocumentStatus = async () => {
    if (!themeId) return;

    try {
      const { data, error } = await supabase
        .from('student_document_status')
        .select('*')
        .eq('theme_id', themeId)
        .single();

      if (error) throw error;
      setDocumentStatus(data);
    } catch (error) {
      console.error('Error loading document status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'submitted': 
      case 'under_review': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected': 
      case 'revision_requested': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600">Approuvé</Badge>;
      case 'submitted': return <Badge variant="outline" className="border-blue-600 text-blue-600">Soumis</Badge>;
      case 'under_review': return <Badge variant="outline" className="border-yellow-600 text-yellow-600">En révision</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejeté</Badge>;
      case 'revision_requested': return <Badge variant="outline" className="border-orange-600 text-orange-600">Révision demandée</Badge>;
      default: return <Badge variant="secondary">Non soumis</Badge>;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels = {
      plan: 'Plan détaillé',
      chapter_1: 'Chapitre 1',
      chapter_2: 'Chapitre 2',
      chapter_3: 'Chapitre 3',
      chapter_4: 'Chapitre 4',
      final_version: 'Version finale'
    };
    return labels[type as keyof typeof labels] || type;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!themeId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Aucun sujet de thèse sélectionné. Veuillez d'abord choisir un sujet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progression globale */}
      {documentStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Progression de votre Mémoire
            </CardTitle>
            <CardDescription>
              {documentStatus.theme_title}
              {documentStatus.supervisor_name && (
                <span className="block text-sm">
                  Encadreur : {documentStatus.supervisor_name}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progrès global</span>
                <span>{documentStatus.overall_progress}%</span>
              </div>
              <Progress value={documentStatus.overall_progress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(documentStatus.plan_status)}
                  <span className="text-sm">Plan</span>
                </div>
                {getStatusBadge(documentStatus.plan_status)}
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(documentStatus.chapter_1_status)}
                  <span className="text-sm">Chapitre 1</span>
                </div>
                {getStatusBadge(documentStatus.chapter_1_status)}
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(documentStatus.chapter_2_status)}
                  <span className="text-sm">Chapitre 2</span>
                </div>
                {getStatusBadge(documentStatus.chapter_2_status)}
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(documentStatus.chapter_3_status)}
                  <span className="text-sm">Chapitre 3</span>
                </div>
                {getStatusBadge(documentStatus.chapter_3_status)}
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(documentStatus.chapter_4_status)}
                  <span className="text-sm">Chapitre 4</span>
                </div>
                {getStatusBadge(documentStatus.chapter_4_status)}
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(documentStatus.final_version_status)}
                  <span className="text-sm">Version finale</span>
                </div>
                {getStatusBadge(documentStatus.final_version_status)}
              </div>
            </div>

            {documentStatus.next_allowed_document !== 'defense_ready' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Prochaine étape :</strong> Vous pouvez déposer votre{' '}
                  <span className="font-semibold">
                    {getDocumentTypeLabel(documentStatus.next_allowed_document)}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {documentStatus.next_allowed_document === 'defense_ready' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Félicitations !</strong> Tous vos documents sont approuvés. 
                  Vous pouvez maintenant planifier votre soutenance.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Déposer</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="feedback">Commentaires</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <DocumentUploadPanelWithValidation
            themeId={themeId}
            onSuccess={() => {
              loadDocuments();
              loadDocumentStatus();
              onDocumentAction?.();
              toast.success('Document déposé avec succès');
            }}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Documents</CardTitle>
              <CardDescription>
                Tous vos documents soumis et leur statut
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun document soumis pour le moment
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {getDocumentTypeLabel(doc.document_type)} • 
                            Soumis le {new Date(doc.submitted_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(doc.status)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDocument(doc)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </Button>

                        {doc.feedback && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab('feedback')}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Voir commentaires
                          </Button>
                        )}
                      </div>

                      {doc.status === 'revision_requested' && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            Des révisions sont demandées pour ce document.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Commentaires de l'Encadreur</CardTitle>
              <CardDescription>
                Retours et suggestions sur vos documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.filter(doc => doc.feedback).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun commentaire disponible
                </div>
              ) : (
                <div className="space-y-4">
                  {documents
                    .filter(doc => doc.feedback)
                    .map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{doc.title}</h4>
                          {getStatusBadge(doc.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getDocumentTypeLabel(doc.document_type)}
                        </p>
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm">{doc.feedback}</p>
                        </div>
                        {doc.reviewed_at && (
                          <p className="text-xs text-muted-foreground">
                            Commenté le {new Date(doc.reviewed_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}