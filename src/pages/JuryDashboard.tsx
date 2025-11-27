import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Theme, JuryDecisionData } from '@/types/database';
import { JuryDeliberationDialog } from '@/components/jury/JuryDeliberationDialog';
import { ThesisViewDialog } from '@/components/jury/ThesisViewDialog';
import { Navbar } from '@/components/layout/Navbar';
import { toast } from 'sonner';

export default function JuryDashboard() {
  const { profile } = useAuth();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [decisions, setDecisions] = useState<JuryDecisionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [showDeliberationDialog, setShowDeliberationDialog] = useState(false);
  const [showThesisDialog, setShowThesisDialog] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Récupérer les thèmes où je suis membre du jury
      const { data: juryMemberships } = await supabase
        .from('jury_members')
        .select('theme_id')
        .eq('member_id', profile?.id);

      if (juryMemberships && juryMemberships.length > 0) {
        const themeIds = juryMemberships.map(jm => jm.theme_id);

        // Récupérer les thèmes
        const { data: themesData, error: themesError } = await supabase
          .from('themes')
          .select(`
            *,
            student:profiles!themes_student_id_fkey(id, first_name, last_name, email),
            supervisor:profiles!themes_supervisor_id_fkey(id, first_name, last_name, email)
          `)
          .in('id', themeIds)
          .eq('status', 'approved');

        if (themesError) throw themesError;
        setThemes(themesData || []);

        // Récupérer les décisions
        const { data: decisionsData, error: decisionsError } = await supabase
          .from('jury_decisions')
          .select(`
            *,
            theme:themes(*),
            student:profiles!jury_decisions_student_id_fkey(*)
          `)
          .in('theme_id', themeIds);

        if (decisionsError) throw decisionsError;
        setDecisions(decisionsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleViewThesis = (theme: Theme) => {
    setSelectedTheme(theme);
    setShowThesisDialog(true);
  };

  const handleDeliberate = (theme: Theme) => {
    setSelectedTheme(theme);
    setShowDeliberationDialog(true);
  };

  const pendingThemes = themes.filter(t => 
    !decisions.find(d => d.theme_id === t.id) || 
    decisions.find(d => d.theme_id === t.id)?.decision === 'pending'
  );

  const decidedThemes = themes.filter(t => 
    decisions.find(d => d.theme_id === t.id && d.decision !== 'pending')
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Jury</h1>
          <p className="text-gray-600 mt-2">
            Évaluation et délibération des mémoires de fin d'études
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mémoires Assignés</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{themes.length}</div>
              <p className="text-xs text-muted-foreground">Total des mémoires</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingThemes.length}</div>
              <p className="text-xs text-muted-foreground">Délibérations en attente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Évalués</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{decidedThemes.length}</div>
              <p className="text-xs text-muted-foreground">Délibérations terminées</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              En Attente ({pendingThemes.length})
            </TabsTrigger>
            <TabsTrigger value="decided">
              Évalués ({decidedThemes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingThemes.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  Aucun mémoire en attente de délibération
                </CardContent>
              </Card>
            ) : (
              pendingThemes.map((theme) => (
                <Card key={theme.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{theme.title}</CardTitle>
                        <CardDescription className="mt-2">
                          Étudiant: {theme.student?.first_name} {theme.student?.last_name}
                        </CardDescription>
                        <CardDescription>
                          Encadreur: {theme.supervisor?.first_name} {theme.supervisor?.last_name}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        En attente
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button onClick={() => handleViewThesis(theme)} variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Consulter le Mémoire
                      </Button>
                      <Button onClick={() => handleDeliberate(theme)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Délibérer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="decided" className="space-y-4">
            {decidedThemes.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  Aucun mémoire évalué
                </CardContent>
              </Card>
            ) : (
              decidedThemes.map((theme) => {
                const decision = decisions.find(d => d.theme_id === theme.id);
                return (
                  <Card key={theme.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{theme.title}</CardTitle>
                          <CardDescription className="mt-2">
                            Étudiant: {theme.student?.first_name} {theme.student?.last_name}
                          </CardDescription>
                          {decision && (
                            <div className="mt-3 space-y-1">
                              <p className="text-sm">
                                <span className="font-medium">Décision:</span>{' '}
                                {decision.decision === 'approved' && 'Approuvé'}
                                {decision.decision === 'corrections_required' && 'Corrections requises'}
                                {decision.decision === 'rejected' && 'Rejeté'}
                              </p>
                              {decision.grade && (
                                <p className="text-sm">
                                  <span className="font-medium">Note:</span> {decision.grade}/20
                                </p>
                              )}
                              {decision.mention && (
                                <p className="text-sm">
                                  <span className="font-medium">Mention:</span> {decision.mention}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={
                            decision?.decision === 'approved' 
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : decision?.decision === 'corrections_required'
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {decision?.decision === 'approved' && 'Approuvé'}
                          {decision?.decision === 'corrections_required' && 'Corrections'}
                          {decision?.decision === 'rejected' && 'Rejeté'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => handleViewThesis(theme)} variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Consulter le Mémoire
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {selectedTheme && (
        <>
          <ThesisViewDialog
            open={showThesisDialog}
            onOpenChange={setShowThesisDialog}
            theme={selectedTheme}
          />
          <JuryDeliberationDialog
            open={showDeliberationDialog}
            onOpenChange={setShowDeliberationDialog}
            theme={selectedTheme}
            onSuccess={() => {
              setShowDeliberationDialog(false);
              fetchData();
            }}
          />
        </>
      )}
    </div>
  );
}
