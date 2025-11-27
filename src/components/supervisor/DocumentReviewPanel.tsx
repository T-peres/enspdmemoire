import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { FileText, Download, MessageSquare, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Document } from '@/types/database';

interface DocumentReviewPanelProps {
  document: Document;
  onReviewed?: () => void;
}

export function DocumentReviewPanel({ document, onReviewed }: DocumentReviewPanelProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentData, setCommentData] = useState({
    comment_text: '',
    page_number: '',
    section_reference: '',
    comment_type: 'general',
    priority: 'normal',
    visible_to_student: true,
  });

  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      plan: 'Plan',
      chapter_1: 'Chapitre 1',
      chapter_2: 'Chapitre 2',
      chapter_3: 'Chapitre 3',
      chapter_4: 'Chapitre 4',
      final_version: 'Version Finale',
    };
    return types[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      submitted: { label: 'Soumis', variant: 'secondary' as const },
      under_review: { label: 'En révision', variant: 'default' as const },
      approved: { label: 'Approuvé', variant: 'default' as const },
      rejected: { label: 'Rejeté', variant: 'destructive' as const },
      revision_requested: { label: 'Révision demandée', variant: 'outline' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleAddComment = async () => {
    if (!profile || !commentData.comment_text) {
      toast.error('Veuillez saisir un commentaire');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('document_comments').insert({
        document_id: document.id,
        author_id: profile.id,
        comment_text: commentData.comment_text,
        page_number: commentData.page_number ? parseInt(commentData.page_number) : null,
        section_reference: commentData.section_reference || null,
        comment_type: commentData.comment_type,
        priority: commentData.priority,
        visible_to_student: commentData.visible_to_student,
      });

      if (error) throw error;

      toast.success('Commentaire ajouté');
      setCommentData({
        comment_text: '',
        page_number: '',
        section_reference: '',
        comment_type: 'general',
        priority: 'normal',
        visible_to_student: true,
      });
      setShowCommentForm(false);
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (newStatus: string, feedback?: string) => {
    if (!profile) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
          feedback: feedback || null,
        })
        .eq('id', document.id);

      if (error) throw error;

      toast.success('Document évalué');
      onReviewed?.();
    } catch (error: any) {
      console.error('Error reviewing document:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Implement download logic
    toast.info('Téléchargement en cours...');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>{document.title}</CardTitle>
              {getStatusBadge(document.status)}
            </div>
            <CardDescription>
              {getDocumentTypeLabel(document.document_type)} • Soumis le{' '}
              {format(new Date(document.submitted_at), 'PPP', { locale: fr })}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {document.feedback && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Feedback précédent</p>
            <p className="text-sm text-muted-foreground">{document.feedback}</p>
          </div>
        )}

        {!showCommentForm ? (
          <Button
            variant="outline"
            onClick={() => setShowCommentForm(true)}
            className="w-full"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Ajouter un commentaire
          </Button>
        ) : (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Nouveau commentaire</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCommentForm(false)}
              >
                Annuler
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="page_number">Page (optionnel)</Label>
                <Input
                  id="page_number"
                  type="number"
                  value={commentData.page_number}
                  onChange={(e) =>
                    setCommentData({ ...commentData, page_number: e.target.value })
                  }
                  placeholder="Numéro de page"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="section_reference">Section (optionnel)</Label>
                <Input
                  id="section_reference"
                  value={commentData.section_reference}
                  onChange={(e) =>
                    setCommentData({ ...commentData, section_reference: e.target.value })
                  }
                  placeholder="Ex: Introduction, 2.3, etc."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="comment_type">Type</Label>
                <Select
                  value={commentData.comment_type}
                  onValueChange={(value) =>
                    setCommentData({ ...commentData, comment_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Général</SelectItem>
                    <SelectItem value="correction">Correction</SelectItem>
                    <SelectItem value="suggestion">Suggestion</SelectItem>
                    <SelectItem value="plagiarism_alert">Alerte plagiat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priorité</Label>
                <Select
                  value={commentData.priority}
                  onValueChange={(value) =>
                    setCommentData({ ...commentData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="critical">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment_text">Commentaire</Label>
              <Textarea
                id="comment_text"
                value={commentData.comment_text}
                onChange={(e) =>
                  setCommentData({ ...commentData, comment_text: e.target.value })
                }
                placeholder="Votre commentaire..."
                rows={4}
              />
            </div>

            <Button onClick={handleAddComment} disabled={loading} className="w-full">
              <MessageSquare className="h-4 w-4 mr-2" />
              Ajouter le commentaire
            </Button>
          </div>
        )}

        {document.status === 'submitted' && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleReview('approved')}
              disabled={loading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approuver
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleReview('revision_requested')}
              disabled={loading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Demander révision
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleReview('rejected')}
              disabled={loading}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Signaler plagiat
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
