import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, FileText, Clock, Calendar, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';

interface DepartmentStats {
  totalStudents: number;
  studentsWithSupervisor: number;
  pendingThemes: number;
  approvedThemes: number;
  pendingMeetings: number;
  pendingDefenses: number;
  completedDefenses: number;
  avgProgress: number;
}

interface DepartmentHeadStatsProps {
  stats: DepartmentStats;
}

export function DepartmentHeadStats({ stats }: DepartmentHeadStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Étudiants</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalStudents}</div>
          <p className="text-xs text-muted-foreground">
            {stats.studentsWithSupervisor} avec encadreur
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Thèmes en Attente</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingThemes}</div>
          <p className="text-xs text-muted-foreground">
            {stats.approvedThemes} approuvés
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Fiches en Attente</CardTitle>
          <FileText className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.pendingMeetings}</div>
          <p className="text-xs text-muted-foreground">À valider</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Soutenances</CardTitle>
          <Calendar className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.pendingDefenses}</div>
          <p className="text-xs text-muted-foreground">
            {stats.completedDefenses} terminées
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Progression Moyenne</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.avgProgress.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Avancement global du département
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Alertes</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {stats.pendingThemes + stats.pendingMeetings}
          </div>
          <p className="text-xs text-muted-foreground">
            Actions requises
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
