import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { PlagiarismReport } from '@/types/database';
import { AlertTriangle, CheckCircle, Download, FileText, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PlagiarismReportViewerProps {
  documentId: string;
}

/**
 * Visualiseur de rapport de plagiat
 * Affiche les résultats du contrôle de plagiat avec détails
 */
export function PlagiarismReportViewer({ documentId }: PlagiarismReportViewerProps) {
  const [report, setReport] = useState<PlagiarismReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (documentId) {
      loadReport();
    }
  }, [documentId]);

  const loadReport = async () => {
    try {
      const { data, error } = await supabase
        .from('plagiarism_reports')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setReport(data);
    } catch (error) {
      console.error('Error loading plagiarism report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50">En attente</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50">En cours</Badge>;
      case 'passed':
        return <Badge variant="outline" className="bg-green-50">Réussi</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50">Échoué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 10) return 'text-green-600';
    if (score < 20) return 'text-yellow-600';
    if (score < 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number, threshold: number) => {
    if (score < threshold) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const downloadReport = async () => {
    if (!report?.report_file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('plagiarism-reports')
        .download(report.report_file_path);

      if (error) throw error;

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-plagiat-${report.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rapport de Plagiat</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rapport de Plagiat</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Aucun contrôle de plagiat n'a encore été effectué pour ce document.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Rapport de Plagiat
            </CardTitle>
            <CardDescription>
              {report.checked_at
                ? `Vérifié le ${format(new Date(report.checked_at), 'PPP', { locale: fr })}`
                : 'En cours de vérification'}
            </CardDescription>
          </div>
          {getStatusBadge(report.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.status === 'pending' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Le contrôle de plagiat est en attente de traitement.
            </AlertDescription>
          </Alert>
        )}

        {report.status === 'in_progress' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Le contrôle de plagiat est en cours. Cela peut prendre quelques minutes.
            </AlertDescription>
          </Alert>
        )}

        {(report.status === 'passed' || report.status === 'failed') && report.plagiarism_score !== null && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getScoreIcon(report.plagiarism_score, report.threshold_used)}
                  <span className="font-semibold">Score de similarité</span>
                </div>
                <span className={`text-3xl font-bold ${getScoreColor(report.plagiarism_score)}`}>
                  {report.plagiarism_score.toFixed(1)}%
                </span>
              </div>

              <Progress
                value={report.plagiarism_score}
                className="h-3"
              />

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Seuil autorisé: {report.threshold_used}%</span>
                <span>
                  {report.plagiarism_score < report.threshold_used ? (
                    <span className="text-green-600 font-medium">✓ Conforme</span>
                  ) : (
                    <span className="text-red-600 font-medium">✗ Non conforme</span>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Sources trouvées</p>
                <p className="text-2xl font-bold">{report.sources_found}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Résultat</p>
                <p className="text-lg font-semibold">
                  {report.passed ? (
                    <span className="text-green-600">Réussi</span>
                  ) : (
                    <span className="text-red-600">Échoué</span>
                  )}
                </p>
              </div>
            </div>

            {report.notes && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-1">Notes</p>
                <p className="text-sm text-blue-800">{report.notes}</p>
              </div>
            )}

            {report.details && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Détails des sources</p>
                <div className="text-sm text-gray-700 space-y-1">
                  {Array.isArray(report.details.sources) && report.details.sources.map((source: any, idx: number) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded">
                      <p className="font-medium">{source.title || `Source ${idx + 1}`}</p>
                      <p className="text-xs text-gray-600">
                        Similarité: {source.similarity}% - {source.url || 'URL non disponible'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.report_file_path && (
              <Button
                onClick={downloadReport}
                variant="outline"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger le Rapport Complet
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
