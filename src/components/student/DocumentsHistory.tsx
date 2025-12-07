import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Document {
  id: string;
  title: string;
  document_type: string;
  file_path: string;
  file_size: number;
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  feedback?: string;
  version: number;
}

interface DocumentsHistoryProps {
  documents: Document[];
}

export function DocumentsHistory({ documents }: DocumentsHistoryProps) {
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
      submitted: { label: 'Soumis', variant: 'secondary' as const, icon: Clock },
      under_review: { label: 'En révision', variant: 'default' as const, icon: Eye },
      approved: { label: 'Approuvé', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Rejeté', variant: 'destructive' as const, icon: AlertTriangle },
      revision_requested: { label: 'Révision demandée', variant: 'outline' as const, icon: AlertTriangle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleDownload = (doc: Document) => {
    window.open(doc.file_path, '_blank');
  };

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Aucun document soumis pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des Documents</CardTitle>
        <CardDescription>
          Tous vos documents soumis et leur statut
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(documents || []).map((doc) => (
            <Card key={doc.id} className={
              doc.status === 'approved' ? 'border-green-200' :
              doc.status === 'rejected' ? 'border-red-200' : ''
            }>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                        <Badge variant="secondary" className="flex-shrink-0">
                          {getDocumentTypeLabel(doc.document_type)}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        Soumis le {format(new Date(doc.submitted_at), 'PPP', { locale: fr })} •{' '}
                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                        {doc.version > 1 && ` • Version ${doc.version}`}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {doc.feedback && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Feedback de l'encadreur</p>
                    <p className="text-sm text-muted-foreground">{doc.feedback}</p>
                    {doc.reviewed_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Révisé le {format(new Date(doc.reviewed_at), 'PPP', { locale: fr })}
                      </p>
                    )}
                  </div>
                )}

                {doc.status === 'approved' && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                    <CheckCircle className="h-4 w-4" />
                    <span>Document approuvé par votre encadreur</span>
                  </div>
                )}

                {doc.status === 'revision_requested' && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Des révisions sont demandées. Consultez le feedback ci-dessus.</span>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc)}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
