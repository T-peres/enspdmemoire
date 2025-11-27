import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudentDashboardStats } from '@/components/student/StudentDashboardStats';
import { DocumentUploadPanel } from '@/components/student/DocumentUploadPanel';
import { DocumentsHistory } from '@/components/student/DocumentsHistory';
import { MeetingsTimeline } from '@/components/student/MeetingsTimeline';
import { PlagiarismReport } from '@/components/student/PlagiarismReport';
import { StudentMessaging } from '@/components/student/StudentMessaging';
import { ThemeStatusCard } from '@/components/student/ThemeStatusCard';
import { BookOpen, User, Building2, Calendar, AlertCircle } from 'lucide-react';
import { TopicSelection } from '@/types/database';

export default function MyThesis() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selection, setSelection] = useState<TopicSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [plagiarismReport, setPlagiarismReport] = useState<any>(null);
  const [stats, setStats] = useState({
    overallProgress: 0,
    documentsSubmitted: 0,
    meetingsCount: 0,
    pendingActions: 0,
    unreadMessages: 0,
    plagiarismScore: undefined,
  });

  useEffect(() => {
    fetchMySelection();
  }, [profile]);

  useEffect(() => {
    if (selection?.topic?.id) {
      loadDocuments();
      loadMeetings();
      loadPlagiarismReport();
      loadStats();
    }
  }, [selection]);

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

  const loadDocuments = async () => {
    if (!selection?.topic?.id) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('theme_id', selection.topic.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error loading documents:', error);
    }
  };

  const loadMeetings = async () => {
    if (!selection?.topic?.id) return;

    try {
      const { data, error } = await supabase
        .from('supervisor_meetings')
        .select('*')
        .eq('theme_id', selection.topic.id)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error: any) {
      console.error('Error loading meetings:', error);
    }
  };

  const loadPlagiarismReport = async () => {
    if (!selection?.topic?.id) return;

    try {
      const { data, error } = await supabase
        .from('plagiarism_reports')
        .select('*')
        .eq('theme_id', selection.topic.id)
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setPlagiarismReport(data);
    } catch (error: any) {
      console.error('Error loading plagiarism report:', error);
    }
  };

  const loadStats = async () => {
    if (!selection?.topic?.id || !profile) return;

    try {
      // Charger les statistiques
      const { data: ficheSuivi } = await supabase
        .from('fiche_suivi')
        .select('overall_progress')
        .eq('theme_id', selection.topic.id)
        .single();

      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', profile.id)
        .eq('read', false);

      const { count: pendingCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('theme_id', selection.topic.id)
        .eq('status', 'revision_requested');

      setStats({
        overallProgress: ficheSuivi?.overall_progress || 0,
        documentsSubmitted: documents.length,
        meetingsCount: meetings.length,
        pendingActions: pendingCount || 0,
        unreadMessages: unreadCount || 0,
        plagiarismScore: plagiarismReport?.plagiarism_score,
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Mon Mémoire</h1>
          <p className="text-muted-foreground">
            Suivi complet de votre projet de mémoire de fin d'études
          </p>
        </div>

        {/* Statistiques */}
        <div className="mb-8">
          <StudentDashboardStats stats={stats} />
        </div>

        {/* Informations du sujet */}
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

        {/* Onglets principaux */}
        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="meetings">Rencontres</TabsTrigger>
            <TabsTrigger value="plagiarism">Anti-Plagiat</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            <DocumentUploadPanel
              themeId={selection.topic?.id || ''}
              onSuccess={() => {
                loadDocuments();
                loadStats();
              }}
            />
            <DocumentsHistory documents={documents} />
          </TabsContent>

          <TabsContent value="meetings" className="space-y-4">
            <MeetingsTimeline meetings={meetings} />
          </TabsContent>

          <TabsContent value="plagiarism" className="space-y-4">
            <PlagiarismReport
              report={plagiarismReport}
              documentTitle={documents[0]?.title || 'Votre document'}
            />
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            {selection.topic?.supervisor ? (
              <StudentMessaging
                supervisorId={selection.topic.supervisor.id}
                supervisorName={`${selection.topic.supervisor.first_name} ${selection.topic.supervisor.last_name}`}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Aucun encadreur assigné pour le moment
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informations Personnelles</CardTitle>
                <CardDescription>
                  Vos données académiques et coordonnées
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium mb-1">Nom complet</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Email</p>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Matricule</p>
                    <p className="text-sm text-muted-foreground">{profile?.student_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Département</p>
                    <p className="text-sm text-muted-foreground">
                      {selection.topic?.department?.name}
                    </p>
                  </div>
                  {profile?.phone && (
                    <div>
                      <p className="text-sm font-medium mb-1">Téléphone</p>
                      <p className="text-sm text-muted-foreground">{profile.phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
