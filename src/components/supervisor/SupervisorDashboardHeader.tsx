import { useAuth } from '@/contexts/AuthContext';
import { useSupervisorDashboardStats } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

export function SupervisorDashboardHeader() {
  const { profile } = useAuth();
  const { stats, loading } = useSupervisorDashboardStats();

  if (loading) {
    return (
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white shadow-xl">
        <Skeleton className="h-32 bg-white/20" />
      </div>
    );
  }

  return (
    <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Tableau de bord Encadreur</h1>
          <p className="text-blue-100 text-lg">
            Bienvenue, {profile?.first_name} {profile?.last_name}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="text-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <p className="text-sm text-blue-100">Étudiants encadrés</p>
            <p className="text-3xl font-bold">{stats.totalStudents}</p>
          </div>
          <div className="text-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <p className="text-sm text-blue-100">Fiches en attente</p>
            <p className="text-3xl font-bold">{stats.pendingMeetings}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
