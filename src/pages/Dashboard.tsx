import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RoleBasedRedirect } from '@/components/auth/RoleBasedRedirect';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, GraduationCap, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { TopicSelection } from '@/types/database';

export default function Dashboard() {
  const { profile, hasRole } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTopics: 0,
    availableTopics: 0,
    mySelection: null as TopicSelection | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      // Fetch topic stats
      const { data: topics, error: topicsError } = await supabase
        .from('thesis_topics')
        .select('id, status, current_students, max_students');

      if (topicsError) throw topicsError;

      const availableTopics = topics?.filter(
        (t) => t.status === 'approved' && t.current_students < t.max_students
      ).length || 0;

      // Fetch student's selection if they're a student
      let mySelection = null;
      if (hasRole('student')) {
        const { data: selectionData, error: selectionError } = await supabase
          .from('topic_selections')
          .select(`
            *,
            topic:thesis_topics(
              *,
              department:departments(*),
              supervisor:profiles!supervisor_id(*)
            )
          `)
          .eq('student_id', profile.id)
          .eq('status', 'confirmed')
          .maybeSingle();

        if (selectionError && selectionError.code !== 'PGRST116') {
          throw selectionError;
        }

        mySelection = selectionData as TopicSelection | null;
      }

      setStats({
        totalTopics: topics?.length || 0,
        availableTopics,
        mySelection,
      });
    } catch (error: any) {
      console.error('Dashboard error:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedRedirect />
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Bienvenue, {profile?.first_name || 'Étudiant'} !
          </h1>
          <p className="text-muted-foreground">
            Tableau de bord de gestion de votre mémoire de fin d'études
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sujets Disponibles</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.availableTopics}</div>
              <p className="text-xs text-muted-foreground">
                Sur {stats.totalTopics} au total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mon Statut</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.mySelection ? 'En cours' : 'À démarrer'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.mySelection ? 'Sujet sélectionné' : 'Aucun sujet sélectionné'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Département</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profile?.department_id ? 'Assigné' : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Configuration du profil
              </p>
            </CardContent>
          </Card>
        </div>

        {/* My Selection Card */}
        {hasRole('student') && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {stats.mySelection ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-success" />
                    Mon Sujet Sélectionné
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-warning" />
                    Aucun Sujet Sélectionné
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {stats.mySelection
                  ? 'Votre sujet de mémoire a été confirmé'
                  : 'Vous devez sélectionner un sujet pour commencer'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.mySelection ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      {stats.mySelection.topic?.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {stats.mySelection.topic?.description}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          Sélectionné le {new Date(stats.mySelection.selected_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {stats.mySelection.topic?.supervisor && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>
                            Encadreur: {stats.mySelection.topic.supervisor.first_name}{' '}
                            {stats.mySelection.topic.supervisor.last_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => navigate('/my-thesis')}>
                    Voir les Détails
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Parcourez la liste des sujets disponibles et sélectionnez celui qui vous intéresse
                  </p>
                  <Button onClick={() => navigate('/topics')}>
                    Explorer les Sujets
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions Rapides</CardTitle>
            <CardDescription>Accédez rapidement aux fonctionnalités principales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => navigate('/topics')}>
                <BookOpen className="h-6 w-6" />
                <span className="font-medium">Explorer les Sujets</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => navigate('/my-thesis')}>
                <GraduationCap className="h-6 w-6" />
                <span className="font-medium">Mon Mémoire</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => navigate('/profile')}>
                <Users className="h-6 w-6" />
                <span className="font-medium">Mon Profil</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
