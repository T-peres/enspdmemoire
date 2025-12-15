import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  MessageSquare,
  Eye,
  AlertTriangle,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

interface SupervisorDocumentInterfaceProps {
  themeId?: string;
  studentId?: string;
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
  student_id: string;
  theme_id: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Theme {
  id: string;
  title: string;
  student_id: string;
  student?: Student;
}

export function SupervisorDocumentInterface({ themeId, studentId, onDocumentAction }: SupervisorDocumentInterfaceProps) {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadSupervisorData();
  }, []);

  const loadSupervisorData = async () => {
    if (!profile) return;

    try {
      // Charger les thèmes supervisés
      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select(`
          id,
          title,
          student_id,
          student:profiles!themes_student_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('supervisor_id', profile.id)
        .eq('status', 'approved');

      if (themesError) throw themesError;
      setThemes(themesData || []);

      // Charger tous les documents des étudiants supervisés
      const themeIds = (themesData || []).map(t => t.id);
      if (themeIds.length > 0) {
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select('*')
          .in('theme_id', themeIds)
          .order('submitted_at', { ascending: false });

        if (documentsError) throw documentsError;
        setDocuments(documentsData || []);
      }
    } catch (error) {
      console.error('Error loading supervisor data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const updateDocumentStatus = async (documentId: string, status: string, feedbackText?: string) => {
    try {
      const updateData: any = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile?.id
      };

      if (feedbackText) {
        updateData.feedback = feedbackText;
      }

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId);

      if (error) throw error;

      // Recharger les documents
      await loadSupervisorData();
      
      // Créer une notification pour l'étudiant
      const document = documents.find(d => d.id === documentId);
      if (document) {
        await supabase.rpc('create_notification', {
          p_user_id: document.student_id,
          p_title: `Document ${status === 'approved' ? 'approuvé' : 'rejeté'}`,
          p_message: `Votre document "${document.title}" a été ${status === 'approved' ? 'approuvé' : 'rejeté'}${feedbackText ? ' avec des commentaires' : ''}`,
          p_type: status === 'approved' ? 'success' : 'warning',
          p_entity_type: 'document'
        });
      }

      toast.success(`Document ${status === 'approved' ? 'approuvé' : 'rejeté'} avec succès`);
      setSelectedDocument(null);
      setFeedback('');
      onDocumentAction?.();
    } catch (error) {
      console.error('Error updating document status:', error);
      toast.error('Erreur lors de la mise à jour du document');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600">Approuvé</Badge>;
      case 'submitted': return <Badge variant="outline" className="border-blue-600 text-blue-600">Soumis</Badge>;
      case 'under_review': return <Badge variant="outline" className="border-yellow-600 text-yellow-600">En révision</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejeté</Badge>;
      case 'revision_requested': return <Badge variant="outline" className="border-orange-600 text-orange-600">Révision demandée</Badge>;
      default: return <Badge variant="secondary">Inconnu</Badge>;
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

  const getStudentName = (studentId: string) => {
    const theme = themes.find(t => t.student_id === studentId);
    if (theme?.student) {
      return `${theme.student.first_name} ${theme.student.last_name}`;
    }
    return 'Étudiant inconnu';
  };

  const getThemeTitle = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    return theme?.title || 'Sujet inconnu';
  };

  const filterDocuments = (status: string) => {
    switch (status) {
      case 'pending':
        return documents.filter(d => ['submitted', 'under_review'].includes(d.status));
      case 'approved':
        return documents.filter(d => d.status === 'approved');
      case 'rejected':
        return documents.filter(d => ['rejected', 'revision_requested'].includes(d.status));
      default:
        return documents;
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
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{filterDocuments('pending').length}</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{filterDocuments('approved').length}</p>
                <p className="text-sm text-muted-foreground">Approuvés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{filterDocuments('rejected').length}</p>
                <p className="text-sm text-muted-foreground">Rejetés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{themes.length}</p>
                <p className="text-sm text-muted-foreground">Étudiants</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            En attente ({filterDocuments('pending').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approuvés ({filterDocuments('approved').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejetés ({filterDocuments('rejected').length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Tous ({documents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Documents en Attente de Révision
              </CardTitle>
              <CardDescription>
                Documents soumis par vos étudiants nécessitant votre attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filterDocuments('pending').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun document en attente de révision
                </div>
              ) : (
                <div className="space-y-4">
                  {filterDocuments('pending').map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {getDocumentTypeLabel(doc.document_type)} • {getStudentName(doc.student_id)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getThemeTitle(doc.theme_id)}
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

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedDocument(doc)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Réviser
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Révision du Document</DialogTitle>
                              <DialogDescription>
                                {doc.title} - {getDocumentTypeLabel(doc.document_type)}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="feedback">Commentaires (optionnel)</Label>
                                <Textarea
                                  id="feedback"
                                  value={feedback}
                                  onChange={(e) => setFeedback(e.target.value)}
                                  placeholder="Ajoutez vos commentaires et suggestions..."
                                  rows={4}
                                />
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  onClick={() => updateDocumentStatus(doc.id, 'approved', feedback)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approuver
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  onClick={() => updateDocumentStatus(doc.id, 'revision_requested', feedback)}
                                  className="border-orange-600 text-orange-600 hover:bg-orange-50"
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Demander des révisions
                                </Button>
                                
                                <Button
                                  variant="destructive"
                                  onClick={() => updateDocumentStatus(doc.id, 'rejected', feedback)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rejeter
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Soumis le {new Date(doc.submitted_at).toLocaleDateString('fr-FR')} à {new Date(doc.submitted_at).toLocaleTimeString('fr-FR')}
                        </AlertDescription>
                      </Alert>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Documents Approuvés
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filterDocuments('approved').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun document approuvé
                </div>
              ) : (
                <div className="space-y-4">
                  {filterDocuments('approved').map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {getDocumentTypeLabel(doc.document_type)} • {getStudentName(doc.student_id)}
                          </p>
                        </div>
                        {getStatusBadge(doc.status)}
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

        <TabsContent value="rejected" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Documents Rejetés / Révisions Demandées
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filterDocuments('rejected').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun document rejeté
                </div>
              ) : (
                <div className="space-y-4">
                  {filterDocuments('rejected').map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {getDocumentTypeLabel(doc.document_type)} • {getStudentName(doc.student_id)}
                          </p>
                        </div>
                        {getStatusBadge(doc.status)}
                      </div>
                      {doc.feedback && (
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm">{doc.feedback}</p>
                        </div>
                      )}
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

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tous les Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun document trouvé
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {getDocumentTypeLabel(doc.document_type)} • {getStudentName(doc.student_id)}
                          </p>
                        </div>
                        {getStatusBadge(doc.status)}
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
      </Tabs>
    </div>
  );
}