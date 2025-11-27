import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle, Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PlagiarismReport {
  id: string;
  plagiarism_score: number;
  status: string;
  checked_at?: string;
  sources_found: number;
  details?: {
    sources: Array<{
      url: string;
      similarity: number;
      title: string;
    }>;
  };
  threshold_used: number;
  passed: boolean;
  report_file_path?: string;
}

interface PlagiarismReportProps {
  report: PlagiarismReport | null;
  documentTitle: string;
}

export function PlagiarismReport({ report, documentTitle }: PlagiarismReportProps) {
  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Contrôle Anti-Plagiat
          </CardTitle>
          <CardDescription>
            Aucun contrôle effectué pour le moment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Le contrôle anti-plagiat sera effectué automatiquement après validation de votre document par l'encadreur.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (report.status === 'pending') {
      return <Badge variant="secondary">En attente</Badge>;
    }
    if (report.status === 'in_progress') {
      return <Badge variant="default">En cours</Badge>;
    }
    if (report.passed) {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Réussi</Badge>;
    }
    return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Échec</Badge>;
  };

  const getScoreColor = () => {
    if (report.plagiarism_score < 10) return 'text-green-600';
    if (report.plagiarism_score < 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = () => {
    if (report.plagiarism_score < 10) return 'bg-green-600';
    if (report.plagiarism_score < 20) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <Card className={report.passed ? 'border-green-200' : 'border-red-200'}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Rapport Anti-Plagiat
            </CardTitle>
            <CardDescription>
              {documentTitle}
              {report.checked_at && (
                <> • Vérifié le {format(new Date(report.checked_at), 'PPP', { locale: fr })}</>
              )}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.status === 'in_progress' && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>Analyse en cours... Cela peut prendre quelques minutes.</span>
          </div>
        )}

        {report.status === 'passed' || report.status === 'failed' ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Score de similarité</span>
                <span className={`text-2xl font-bold ${getScoreColor()}`}>
                  {report.plagiarism_score}%
                </span>
              </div>
              <Progress 
                value={report.plagiarism_score} 
                className="h-3"
                indicatorClassName={getProgressColor()}
              />
              <p className="text-xs text-muted-foreground">
                Seuil autorisé: {report.threshold_used}%
              </p>
            </div>

            {report.passed ? (
              <div className="flex items-start gap-2 text-sm text-green-600 bg-green-50 p-3 rounded">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Document conforme</p>
                  <p>Votre document respecte les normes anti-plagiat de l'établissement.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Taux de plagiat élevé</p>
                  <p>Votre document dépasse le seuil autorisé. Veuillez réviser les sections signalées.</p>
                </div>
              </div>
            )}

            {report.sources_found > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">
                  Sources détectées ({report.sources_found})
                </h4>
                {report.details?.sources && report.details.sources.length > 0 ? (
                  <div className="space-y-2">
                    {report.details.sources.slice(0, 5).map((source, index) => (
                      <div key={index} className="p-2 border rounded-lg text-sm">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-xs truncate flex-1">{source.title}</p>
                          <Badge variant="outline" className="ml-2 flex-shrink-0">
                            {source.similarity}%
                          </Badge>
                        </div>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {source.url}
                        </a>
                      </div>
                    ))}
                    {report.details.sources.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        Et {report.details.sources.length - 5} autre(s) source(s)...
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Détails des sources non disponibles
                  </p>
                )}
              </div>
            )}

            {report.report_file_path && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(report.report_file_path, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger le rapport complet
              </Button>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
