import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  StudentAlertsPanel,
  FinalSubmissionButton,
  MeetingHistoryComplete,
  ProgressChart,
  TimelineView,
  NotificationCenter,
  DocumentUploader,
  PlagiarismReportViewer
} from '@/components';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText, TrendingUp, Bell } from 'lucide-react';

/**
 * Exemple de page complète pour l'étudiant
 * Démontre l'utilisation de tous les composants créés
 */
export function StudentDashboardExample() {
  const { profile } = useAuth();
  const [theme, setTheme] = useState<any>(null);
  const [finalDocument, setFinalDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, [profile]);

  const loadStudentData = async () => {
    if (!profile) return;

    try {
      // Charger le thème de l'étudiant
      const { data: themeData } = await supabase
        .from('themes')
        .select('*')
        .eq('student_id', profile.id)
        .eq('status', 'approved')
        .single();

      setTheme(themeData);

      if (themeData) {
        // Charger le document final
        const { data: docData } = await supabase
          .from('documents')
          .select('*')
          .eq('theme_id', themeData.id)
          .eq('document_type', 'final_version')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        setFinalDocument(docData);
      }
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Aucun Thème Approuvé</CardTitle>
            <CardDescription>
              Vous devez d'abord soumettre et faire approuver un thème de mémoire.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mon Mémoire</h1>
          <p className="text-gray-600">{theme.title}</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-800">
          Thème Approuvé
        </Badge>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Onglets principaux */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">
                <TrendingUp className="h-4 w-4 mr-2" />
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="meetings">
                <BookOpen className="h-4 w-4 mr-2" />
                Réunions
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Bell className="h-4 w-4 mr-2" />
                Chronologie
              </TabsTrigger>
            </TabsList>

            {/* Vue d'ensemble */}
            <TabsContent value="overview" className="space-y-6">
              <StudentAlertsPanel />
              <ProgressChart themeId={theme.id} />
              
              {finalDocument && (
                <PlagiarismReportViewer documentId={finalDocument.id} />
              )}
            </TabsContent>

            {/* Documents */}
            <TabsContent value="documents" className="space-y-6">
              <DocumentUploader 
                themeId={theme.id}
                onUploaded={loadStudentData}
              />

              {finalDocument && (
                <FinalSubmissionButton
                  themeId={theme.id}
                  documentId={finalDocument.id}
                  onSubmitted={loadStudentData}
                />
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Mes Documents</CardTitle>
                  <CardDescription>
                    Liste de tous les documents soumis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Utilisez le composant DocumentList ici
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Réunions */}
            <TabsContent value="meetings" className="space-y-6">
              <MeetingHistoryComplete themeId={theme.id} />
            </TabsContent>

            {/* Chronologie */}
            <TabsContent value="timeline" className="space-y-6">
              <TimelineView themeId={theme.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Colonne latérale (1/3) */}
        <div className="space-y-6">
          {/* Centre de notifications */}
          <NotificationCenter />

          {/* Informations du thème */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Encadreur</p>
                <p className="font-medium">
                  {theme.supervisor?.first_name} {theme.supervisor?.last_name}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Date de soumission</p>
                <p className="font-medium">
                  {new Date(theme.submitted_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {theme.reviewed_at && (
                <div>
                  <p className="text-gray-600">Date d'approbation</p>
                  <p className="font-medium">
                    {new Date(theme.reviewed_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aide rapide */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base text-blue-900">
                Besoin d'aide ?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800 space-y-2">
              <p>• Consultez le guide de l'étudiant</p>
              <p>• Contactez votre encadreur</p>
              <p>• Visitez la FAQ</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
