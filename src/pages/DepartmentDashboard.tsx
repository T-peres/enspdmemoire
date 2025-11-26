import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ThesisTopic, TopicStatus } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, BarChart3, FileText, Users } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const statusColors = {
  pending: 'hsl(var(--warning))',
  approved: 'hsl(var(--success))',
  rejected: 'hsl(var(--destructive))',
  locked: 'hsl(var(--muted))',
};

export default function DepartmentDashboard() {
  const { profile, hasRole } = useAuth();
  const { toast } = useToast();
  const [topics, setTopics] = useState<ThesisTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    locked: 0,
  });

  useEffect(() => {
    if (profile?.department_id) {
      fetchTopics();
    }
  }, [profile]);

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('thesis_topics')
        .select(`
          *,
          department:departments(*),
          supervisor:profiles!supervisor_id(*)
        `)
        .eq('department_id', profile?.department_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTopics((data as ThesisTopic[]) || []);

      // Calculate statistics
      const newStats = {
        pending: data?.filter(t => t.status === 'pending').length || 0,
        approved: data?.filter(t => t.status === 'approved').length || 0,
        rejected: data?.filter(t => t.status === 'rejected').length || 0,
        locked: data?.filter(t => t.status === 'locked').length || 0,
      };
      setStats(newStats);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (topicId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('thesis_topics')
        .update({ status: newStatus })
        .eq('id', topicId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Sujet ${newStatus === 'approved' ? 'approuvé' : 'rejeté'}`,
      });

      fetchTopics();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'outline',
      approved: 'default',
      rejected: 'destructive',
      locked: 'secondary',
    };

    const labels: any = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
      locked: 'Verrouillé',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const chartData = [
    { name: 'En attente', value: stats.pending, color: statusColors.pending },
    { name: 'Approuvés', value: stats.approved, color: statusColors.approved },
    { name: 'Rejetés', value: stats.rejected, color: statusColors.rejected },
    { name: 'Verrouillés', value: stats.locked, color: statusColors.locked },
  ];

  const chartConfig = {
    pending: { label: 'En attente', color: statusColors.pending },
    approved: { label: 'Approuvés', color: statusColors.approved },
    rejected: { label: 'Rejetés', color: statusColors.rejected },
    locked: { label: 'Verrouillés', color: statusColors.locked },
  };

  if (!hasRole('department_head')) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold mb-4">Accès Refusé</h1>
            <p className="text-muted-foreground">
              Cette page est réservée aux chefs de département.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Tableau de Bord Département</h1>
          <p className="text-muted-foreground">
            Gérez les sujets de mémoire de votre département
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">En Attente</CardTitle>
                  <Clock className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <p className="text-xs text-muted-foreground">Sujets à approuver</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approuvés</CardTitle>
                  <CheckCircle className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.approved}</div>
                  <p className="text-xs text-muted-foreground">Sujets validés</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rejetés</CardTitle>
                  <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.rejected}</div>
                  <p className="text-xs text-muted-foreground">Sujets refusés</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                  <FileText className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{topics.length}</div>
                  <p className="text-xs text-muted-foreground">Tous les sujets</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Répartition des Sujets
                </CardTitle>
                <CardDescription>
                  Distribution des sujets par statut
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Pending Topics Table */}
            {stats.pending > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Sujets en Attente d'Approbation
                  </CardTitle>
                  <CardDescription>
                    {stats.pending} sujet{stats.pending > 1 ? 's' : ''} à valider
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Proposé par</TableHead>
                        <TableHead>Places</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topics
                        .filter(topic => topic.status === 'pending')
                        .map(topic => (
                          <TableRow key={topic.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{topic.title}</div>
                                {topic.description && (
                                  <div className="text-sm text-muted-foreground line-clamp-1">
                                    {topic.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {topic.supervisor
                                ? `${topic.supervisor.first_name} ${topic.supervisor.last_name}`
                                : 'Non assigné'}
                            </TableCell>
                            <TableCell>
                              {topic.current_students}/{topic.max_students}
                            </TableCell>
                            <TableCell>
                              {new Date(topic.created_at).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleStatusChange(topic.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approuver
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleStatusChange(topic.id, 'rejected')}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Rejeter
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* All Topics Table */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Tous les Sujets du Département</CardTitle>
                <CardDescription>
                  Historique complet de tous les sujets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Superviseur</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Étudiants</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topics.map(topic => (
                      <TableRow key={topic.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{topic.title}</div>
                            {topic.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {topic.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {topic.supervisor
                            ? `${topic.supervisor.first_name} ${topic.supervisor.last_name}`
                            : 'Non assigné'}
                        </TableCell>
                        <TableCell>{getStatusBadge(topic.status)}</TableCell>
                        <TableCell>
                          {topic.current_students}/{topic.max_students}
                        </TableCell>
                        <TableCell>
                          {new Date(topic.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
