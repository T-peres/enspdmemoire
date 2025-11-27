import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FileText, Calendar, CheckCircle, AlertCircle, MessageSquare, Upload } from 'lucide-react';

interface StudentStats {
  overallProgress: number;
  documentsSubmitted: number;
  meetingsCount: number;
  pendingActions: number;
  unreadMessages: number;
  plagiarismScore?: number;
}

interface StudentDashboardStatsProps {
  stats: StudentStats;
}

export function StudentDashboardStats({ stats }: StudentDashboardStatsProps) {
  return (
    <div className="space-y-4">
      {/* Progression globale */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Avancement Global</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression du mémoire</span>
              <span className="font-semibold">{stats.overallProgress}%</span>
            </div>
            <Progress value={stats.overallProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Statistiques en grille */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Documents Soumis</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documentsSubmitted}</div>
            <p className="text-xs text-muted-foreground">Versions déposées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rencontres</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.meetingsCount}</div>
            <p className="text-xs text-muted-foreground">Avec votre encadreur</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actions Requises</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingActions}</div>
            <p className="text-xs text-muted-foreground">À traiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.unreadMessages}</div>
            <p className="text-xs text-muted-foreground">Non lus</p>
          </CardContent>
        </Card>

        {stats.plagiarismScore !== undefined && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Plagiat</CardTitle>
              <CheckCircle className={`h-4 w-4 ${stats.plagiarismScore < 20 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.plagiarismScore < 20 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.plagiarismScore}%
              </div>
              <p className="text-xs text-muted-foreground">Dernier scan</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Statut</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">En cours</div>
            <p className="text-xs text-muted-foreground">Rédaction active</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
