import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, User, Building2, Calendar, AlertCircle } from 'lucide-react';
import { TopicSelection } from '@/types/database';

export default function MyThesis() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selection, setSelection] = useState<TopicSelection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMySelection();
  }, [profile]);

  const fetchMySelection = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
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

      if (error && error.code !== 'PGRST116') throw error;

      setSelection(data as TopicSelection | null);
    } catch (error: any) {
      console.error('Error fetching selection:', error);
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

  if (!selection) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto text-center py-12">
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-warning-light flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-warning" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Aucun Sujet Sélectionné</h2>
                <p className="text-muted-foreground mb-6">
                  Vous devez d'abord sélectionner un sujet de mémoire pour accéder à cette page
                </p>
                <Button onClick={() => navigate('/topics')}>
                  Explorer les Sujets Disponibles
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Mon Mémoire</h1>
            <p className="text-muted-foreground">
              Suivi de votre projet de mémoire de fin d'études
            </p>
          </div>

          {/* Topic Details */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">
                      {selection.topic?.department?.code}
                    </Badge>
                    <Badge variant="outline" className="text-success border-success">
                      Confirmé
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl mb-2">
                    {selection.topic?.title}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {selection.topic?.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Encadreur</p>
                    <p className="text-sm text-muted-foreground">
                      {selection.topic?.supervisor
                        ? `${selection.topic.supervisor.first_name} ${selection.topic.supervisor.last_name}`
                        : 'Non assigné'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Département</p>
                    <p className="text-sm text-muted-foreground">
                      {selection.topic?.department?.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Date de sélection</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selection.selected_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Statut</p>
                    <p className="text-sm text-muted-foreground">
                      En préparation
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps Card */}
          <Card>
            <CardHeader>
              <CardTitle>Prochaines Étapes</CardTitle>
              <CardDescription>
                Suivez ces étapes pour avancer dans votre mémoire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Rencontrer votre encadreur</h4>
                    <p className="text-sm text-muted-foreground">
                      Prenez contact avec votre encadreur pour définir le cadre de votre travail
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors opacity-60">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Rédiger le plan détaillé</h4>
                    <p className="text-sm text-muted-foreground">
                      Élaborez un plan détaillé de votre mémoire pour validation
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors opacity-60">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Travaux de recherche</h4>
                    <p className="text-sm text-muted-foreground">
                      Commencez vos recherches et la rédaction du mémoire
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
