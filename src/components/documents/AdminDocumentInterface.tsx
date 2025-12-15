import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Settings, 
  Database, 
  Users, 
  FileText, 
  BarChart3,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminDocumentInterfaceProps {
  onDocumentAction?: () => void;
}

interface SystemStats {
  total_users: number;
  total_documents: number;
  total_themes: number;
  total_defenses: number;
  storage_used: number;
  active_sessions: number;
}

interface DepartmentStats {
  department_id: string;
  department_name: string;
  total_students: number;
  total_supervisors: number;
  documents_count: number;
  completion_rate: number;
}

interface SystemHealth {
  database_status: 'healthy' | 'warning' | 'error';
  storage_status: 'healthy' | 'warning' | 'error';
  api_status: 'healthy' | 'warning' | 'error';
  last_backup: string;
}

export function AdminDocumentInterface({ onDocumentAction }: AdminDocumentInterfaceProps) {
  const { profile } = useAuth();
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState('current_year');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAdminData();
  }, [selectedDepartment, selectedPeriod]);

  const loadAdminData = async () => {
    try {
      // Charger les statistiques système
      const { data: statsData, error: statsError } = await supabase.rpc('get_system_stats');
      if (statsError) throw statsError;
      setSystemStats(statsData);

      // Charger les statistiques par département
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select(`
          id,
          name,
          profiles(count),
          themes(count)
        `);
      
      if (deptError) throw deptError;
      
      const formattedDeptStats = (deptData || []).map(dept => ({
        department_id: dept.id,
        department_name: dept.name,
        total_students: dept.profiles?.filter((p: any) => p.role === 'student').length || 0,
        total_supervisors: dept.profiles?.filter((p: any) => p.role === 'supervisor').length || 0,
        documents_count: 0, // À calculer
        completion_rate: 0 // À calculer
      }));
      
      setDepartmentStats(formattedDeptStats);

      // Simuler l'état de santé du système
      setSystemHealth({
        database_status: 'healthy',
        storage_status: 'healthy',
        api_status: 'healthy',
        last_backup: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Erreur lors du chargement des données administrateur');
    } finally {
      setLoading(false);
    }
  };

  const exportSystemReport = async () => {
    try {
      // Générer un rapport système complet
      const reportData = {
        generated_at: new Date().toISOString(),
        system_stats: systemStats,
        department_stats: departmentStats,
        system_health: systemHealth
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_systeme_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Rapport système exporté');
    } catch (error) {
      console.error('Error exporting system report:', error);
      toast.error('Erreur lors de l\'exportation du rapport');
    }
  };

  const refreshSystemData = async () => {
    setLoading(true);
    await loadAdminData();
    toast.success('Données système actualisées');
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-600">Sain</Badge>;
      case 'warning': return <Badge variant="outline" className="border-yellow-600 text-yellow-600">Attention</Badge>;
      case 'error': return <Badge variant="destructive">Erreur</Badge>;
      default: return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Administration Système</h2>
          <p className="text-muted-foreground">
            Gestion et surveillance du système de gestion des soutenances
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_year">Année en cours</SelectItem>
              <SelectItem value="last_month">Dernier mois</SelectItem>
              <SelectItem value="last_quarter">Dernier trimestre</SelectItem>
              <SelectItem value="all_time">Toutes périodes</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={refreshSystemData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          
          <Button onClick={exportSystemReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Statistiques système */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{systemStats.total_users}</p>
                  <p className="text-sm text-muted-foreground">Utilisateurs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{systemStats.total_documents}</p>
                  <p className="text-sm text-muted-foreground">Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{systemStats.total_themes}</p>
                  <p className="text-sm text-muted-foreground">Sujets</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{systemStats.total_defenses}</p>
                  <p className="text-sm text-muted-foreground">Soutenances</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{Math.round(systemStats.storage_used / 1024)}GB</p>
                  <p className="text-sm text-muted-foreground">Stockage</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-600" />
                <div>
                  <p className="text-2xl font-bold">{systemStats.active_sessions}</p>
                  <p className="text-sm text-muted-foreground">Sessions actives</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* État de santé du système */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              État de Santé du Système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getHealthStatusIcon(systemHealth.database_status)}
                  <span className="text-sm">Base de données</span>
                </div>
                {getHealthStatusBadge(systemHealth.database_status)}
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getHealthStatusIcon(systemHealth.storage_status)}
                  <span className="text-sm">Stockage</span>
                </div>
                {getHealthStatusBadge(systemHealth.storage_status)}
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getHealthStatusIcon(systemHealth.api_status)}
                  <span className="text-sm">API</span>
                </div>
                {getHealthStatusBadge(systemHealth.api_status)}
              </div>
            </div>
            
            <div className="mt-4 text-sm text-muted-foreground">
              Dernière sauvegarde : {new Date(systemHealth.last_backup).toLocaleString('fr-FR')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="departments">Départements</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="system">Système</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Activité Récente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Documents soumis aujourd'hui</span>
                    <Badge variant="outline">+12</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Nouveaux utilisateurs cette semaine</span>
                    <Badge variant="outline">+5</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Soutenances programmées</span>
                    <Badge variant="outline">8</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Alertes système</span>
                    <Badge variant="destructive">2</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Système</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Utilisation CPU</span>
                      <span>45%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Utilisation mémoire</span>
                      <span>62%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Utilisation stockage</span>
                      <span>78%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques par Département</CardTitle>
              <CardDescription>
                Performance et activité de chaque département
              </CardDescription>
            </CardHeader>
            <CardContent>
              {departmentStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun département trouvé
                </div>
              ) : (
                <div className="space-y-4">
                  {departmentStats.map((dept) => (
                    <div key={dept.department_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{dept.department_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {dept.total_students} étudiants • {dept.total_supervisors} encadreurs
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-lg font-bold">{dept.documents_count}</p>
                            <p className="text-xs text-muted-foreground">Documents</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold">{dept.completion_rate}%</p>
                            <p className="text-xs text-muted-foreground">Taux de réussite</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Utilisateurs</CardTitle>
              <CardDescription>
                Administration des comptes utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input placeholder="Rechercher un utilisateur..." className="flex-1" />
                  <Button variant="outline">Rechercher</Button>
                </div>
                
                <div className="text-center py-8 text-muted-foreground">
                  Interface de gestion des utilisateurs en cours de développement
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration Système
              </CardTitle>
              <CardDescription>
                Paramètres et maintenance du système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <Database className="h-6 w-6 mb-2" />
                    Sauvegarde Base de Données
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex-col">
                    <RefreshCw className="h-6 w-6 mb-2" />
                    Actualiser Cache
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex-col">
                    <BarChart3 className="h-6 w-6 mb-2" />
                    Générer Rapport
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex-col">
                    <Settings className="h-6 w-6 mb-2" />
                    Paramètres Avancés
                  </Button>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Logs Système</h4>
                  <div className="bg-muted p-3 rounded-md text-sm font-mono">
                    [2024-12-15 10:30:15] INFO: Système démarré avec succès<br/>
                    [2024-12-15 10:30:16] INFO: Base de données connectée<br/>
                    [2024-12-15 10:30:17] INFO: Stockage initialisé<br/>
                    [2024-12-15 10:30:18] INFO: API prête à recevoir des requêtes
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}