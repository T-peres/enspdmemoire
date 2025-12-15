import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Calendar, 
  MessageSquare, 
  Users, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { SupervisorAlertCenter } from './SupervisorAlertCenter';
import { SupervisorMeetingPlanner } from './SupervisorMeetingPlanner';
import { SupervisorMessaging } from './SupervisorMessaging';
import { SupervisorStudentsList } from './SupervisorStudentsList';
import { SupervisorDocumentReview } from './SupervisorDocumentReview';

interface SupervisorStats {
  total_students: number;
  pending_meetings: number;
  unread_messages: number;
  pending_documents: number;
  completed_validations: number;
  active_alerts: number;
}

export function SupervisorWorkspace() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SupervisorStats>({
    total_students: 0,
    pending_meetings: 0,
    unread_messages: 0,
    pending_documents: 0,
    completed_validations: 0,
    active_alerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupervisorStats();
  }, [user]);

  const fetchSupervisorStats = async () => {
    if (!user) return;

    try {
      // Appel à une fonction RPC pour récupérer les statistiques
      const { data, error } = await supabase.rpc('get_supervisor_dashboard_stats', {
        supervisor_id: user.id
      });

      if (error) throw error;
      
      setStats(data || {
        total_students: 0,
        pending_meetings: 0,
        unread_messages: 0,
        pending_documents: 0,
        completed_validations: 0,
        active_alerts: 0,
      });
    } catch (error) {
      console.error('Error fetching supervisor stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    variant = 'default',
    description 
  }: {
    title: string;
    value: number;
    icon: any;
    variant?: 'default' | 'warning' | 'success' | 'destructive';
    description?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Espace Encadreur</h1>
        <p className="text-muted-foreground mt-2">
          Gérez vos étudiants, planifiez vos rencontres et suivez les progrès
        </p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Étudiants"
          value={stats.total_students}
          icon={Users}
          description="Total encadrés"
        />
        <StatCard
          title="Rencontres"
          value={stats.pending_meetings}
          icon={Calendar}
          variant={stats.pending_meetings > 0 ? 'warning' : 'default'}
          description="En attente"
        />
        <StatCard
          title="Messages"
          value={stats.unread_messages}
          icon={MessageSquare}
          variant={stats.unread_messages > 0 ? 'warning' : 'default'}
          description="Non lus"
        />
        <StatCard
          title="Documents"
          value={stats.pending_documents}
          icon={FileText}
          variant={stats.pending_documents > 0 ? 'warning' : 'default'}
          description="À réviser"
        />
        <StatCard
          title="Validations"
          value={stats.completed_validations}
          icon={CheckCircle}
          variant="success"
          description="Complétées"
        />
        <StatCard
          title="Alertes"
          value={stats.active_alerts}
          icon={Bell}
          variant={stats.active_alerts > 0 ? 'destructive' : 'default'}
          description="Actives"
        />
      </div>

      {/* Interface à onglets */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertes
            {stats.active_alerts > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                {stats.active_alerts}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="meetings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Rencontres
            {stats.pending_meetings > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                {stats.pending_meetings}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
            {stats.unread_messages > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                {stats.unread_messages}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Étudiants
          </TabsTrigger>
          
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
            {stats.pending_documents > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                {stats.pending_documents}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <SupervisorAlertCenter 
            supervisorId={user?.id || ''} 
            onAlertUpdate={fetchSupervisorStats}
          />
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          <SupervisorMeetingPlanner 
            supervisorId={user?.id || ''} 
            onMeetingUpdate={fetchSupervisorStats}
          />
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <SupervisorMessaging 
            supervisorId={user?.id || ''} 
            onMessageUpdate={fetchSupervisorStats}
          />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <SupervisorStudentsList 
            supervisorId={user?.id || ''} 
            onStudentUpdate={fetchSupervisorStats}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <SupervisorDocumentReview 
            supervisorId={user?.id || ''} 
            onDocumentUpdate={fetchSupervisorStats}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}