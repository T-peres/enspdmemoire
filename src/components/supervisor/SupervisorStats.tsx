import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface SupervisorStatsData {
  totalStudents: number;
  pendingMeetings: number;
  completedMeetings: number;
  studentsInProgress: number;
  studentsCompleted: number;
  overdueTasks: number;
}

export function SupervisorStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SupervisorStatsData>({
    totalStudents: 0,
    pendingMeetings: 0,
    completedMeetings: 0,
    studentsInProgress: 0,
    studentsCompleted: 0,
    overdueTasks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user?.id]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_supervisor_stats', {
        p_supervisor_id: user!.id,
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setStats({
          totalStudents: Number(data[0].total_students) || 0,
          pendingMeetings: Number(data[0].pending_meetings) || 0,
          completedMeetings: Number(data[0].completed_meetings) || 0,
          studentsInProgress: Number(data[0].students_in_progress) || 0,
          studentsCompleted: Number(data[0].students_completed) || 0,
          overdueTasks: Number(data[0].overdue_tasks) || 0,
        });
      }
    } catch (error) {
      console.error('Error loading supervisor stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Étudiants encadrés',
      value: stats.totalStudents,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Fiches en attente',
      value: stats.pendingMeetings,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Fiches validées',
      value: stats.completedMeetings,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Tâches en retard',
      value: stats.overdueTasks,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-full`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}