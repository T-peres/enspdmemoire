import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Eye, MessageCircle, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ReportDocument {
  id: string;
  filename: string;
  upload_date: string;
  version: number;
  status: 'pending' | 'approved' | 'needs_revision';
  file_url: string;
  comments?: string;
}

interface ReportManagementProps {
  documents: ReportDocument[];
  studentId: string;
  onAddComment: (documentId: string, comment: string, isPrivate: boolean) => void;
  onRequestRevision: (documentId: string, comment: string) => void;
  onReportPlagiarism: (documentId: string) => void;
}

export function ReportManagement({ 
  documents, 
  studentId, 
  onAddComment, 
  onRequestRevision, 
  onReportPlagiarism 
}: ReportManagementProps) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [comment, setComment] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleAddComment = () => {
    if (!selectedDoc || !comment.trim()) return;
    onAddComment(selectedDoc.id, comment, isPrivate);
    setComment('');
    setSelectedDoc(null);
    toast.success('Commentaire ajouté');
  };

  const handleRequestRevision = () => {
    if (!selectedDoc || !comment.trim()) return;
    onRequestRevision(selectedDoc.id, comment);
    setComment('');
    setSelectedDoc(null);
    toast.success('Demande de révision envoyée');
  };

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'needs_revision': return 'destructive';
    }
  };

  const getStatusText = (status: Document['status']) => {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'pending': return 'En attente';
      case 'needs_revision': return 'Révision requise';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Gestion des Rapports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">{doc.filename}</h4>
                  <p className="text-sm text-muted-foreground">
                    Version {doc.version} • {new Date(doc.upload_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Badge variant={getStatusColor(doc.status)}>
                  {getStatusText(doc.status)}
                </Badge>
              </div>
              
              {doc.comments && (
                <div className="mb-3 p-2 bg-muted rounded text-sm">
                  <strong>Commentaires:</strong> {doc.comments}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={doc.file_url} download>
                    <Download className="h-4 w-4 mr-1" />
                    Télécharger
                  </a>
                </Button>
                
                <Button size="sm" variant="outline" asChild>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-1" />
                    Consulter
                  </a>
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Commenter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un commentaire</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Votre commentaire..."
                        rows={4}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="private"
                          checked={isPrivate}
                          onChange={(e) => setIsPrivate(e.target.checked)}
                        />
                        <label htmlFor="private" className="text-sm">
                          Commentaire privé (non visible par l'étudiant)
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAddComment} className="flex-1">
                          Ajouter commentaire
                        </Button>
                        <Button onClick={handleRequestRevision} variant="outline" className="flex-1">
                          Demander révision
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => onReportPlagiarism(doc.id)}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Signaler plagiat
                </Button>
              </div>
            </div>
          ))}
          
          {documents.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Aucun document déposé
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}