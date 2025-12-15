import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ThesisTopic, Department } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, BarChart3, FileText, Users, Building2, UserCheck } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import { SupervisorAssignmentForm } from '@/components/department/SupervisorAssignmentForm';
import { SupervisorsList } from '@/components/department/SupervisorsList';
import { FicheSuiviValidation } from '@/components/department/FicheSuiviValidation';
import { RecentAssignments } from '@/components/department/RecentAssignments';

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
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    locked: 0,
  });

  useEffect(() => {
    setIsMounted(true);
    if (profile?.department_id) {
      fetchDepartmentData();
    }
    
    return () => {
      setIsMounted(false);
    };
  }, [profile]);

  const fetchDepartmentData = async () => {
    try {
      // Charger les informations du département
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('id', profile?.department_id)
        .single();

      if (deptError) throw deptError;
      setDepartment(deptData);

      // Charger les sujets
      await fetchTopics();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

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

  const chartData = useMemo(() => {
    // Toujours afficher tous les statuts, même avec 0
    const data = [
      { name: 'En attente', value: stats.pending, color: statusColors.pending },
      { name: 'Approuvés', value: stats.approved, color: statusColors.approved },
      { name: 'Rejetés', value: stats.rejected, color: statusColors.rejected },
      { name: 'Verrouillés', value: stats.locked, color: statusColors.locked },
    ];
    
    // Filtrer les valeurs à 0 seulement pour le graphique (pas pour la légende)
    const hasData = data.some(item => item.value > 0);
    return hasData ? data : data.map(item => ({ ...item, value: 0.1 })); // Afficher un petit segment si tout est à 0
  }, [stats]);

  const chartConfig = {
    pending: { label: 'En attente', color: statusColors.pending },
    approved: { label: 'Approuvés', color: statusColors.approved },
    rejected: { label: 'Rejetés', color: statusColors.rejected },
    locked: { label: 'Verrouillés', color: statusColors.locked },
  };

  // Couleurs par département
  const getDepartmentColor = (code: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; accent: string }> = {
      'GIT': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', accent: 'bg-blue-600' },
      'GESI': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', accent: 'bg-purple-600' },
      'GQHSE': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', accent: 'bg-green-600' },
      'GAM': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', accent: 'bg-orange-600' },
      'GMP': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300', accent: 'bg-cyan-600' },
      'GP': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300', accent: 'bg-indigo-600' },
      'GE': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', accent: 'bg-yellow-600' },
      'GM': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', accent: 'bg-red-600' },
      'GPH': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-300', accent: 'bg-pink-600' },
      'GC': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300', accent: 'bg-teal-600' },
    };
    return colors[code] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', accent: 'bg-gray-600' };
  };

  const deptColors = department ? getDepartmentColor(department.code) : { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300', accent: 'bg-gray-600' };

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
      
      {/* Bandeau personnalisé du département */}
      {department && (
        <div className={`${deptColors.bg} ${deptColors.border} border-b-4`}>
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <div className={`${deptColors.accent} p-3 rounded-lg text-white shadow-lg`}>
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${deptColors.text}`}>
                  {department.name}
                </h2>
                <p className="text-sm text-gray-600">
                  Code: <span className="font-semibold">{department.code}</span> • Chef de Département: {profile?.first_name} {profile?.last_name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Tableau de Bord Chef de Département</h1>
          <p className="text-muted-foreground">
            Gestion complète du département {department?.code}
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
          <Tabs defaultValue="topics" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="topics">Sujets de Thèse</TabsTrigger>
              <TabsTrigger value="assignments">Attribution Encadreurs</TabsTrigger>
              <TabsTrigger value="supervisors">Encadreurs</TabsTrigger>
              <TabsTrigger value="validation">Validation Fiches</TabsTrigger>
            </TabsList>

            <TabsContent value="topics" className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  Répartition des Sujets du Département {department?.code}
                </CardTitle>
                <CardDescription>
                  Distribution de tous les {topics.length} sujets de thèse par statut
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isMounted && (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <PieChart width={885} height={300}>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => {
                          // Afficher la vraie valeur depuis stats, pas la valeur du graphique
                          const realValue = name === 'En attente' ? stats.pending :
                                          name === 'Approuvés' ? stats.approved :
                                          name === 'Rejetés' ? stats.rejected :
                                          stats.locked;
                          return `${name}: ${realValue}`;
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                      />
                      <Legend />
                    </PieChart>
                  </ChartContainer>
                )}
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

            {/* All Topics Table - Moved inside topics tab */}
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
            </TabsContent>

            <TabsContent value="assignments" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <SupervisorAssignmentForm />
                <RecentAssignments />
              </div>
            </TabsContent>

            <TabsContent value="supervisors" className="space-y-6">
              <SupervisorsList />
            </TabsContent>

            <TabsContent value="validation" className="space-y-6">
              <FicheSuiviValidation />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
