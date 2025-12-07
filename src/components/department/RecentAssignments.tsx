import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserCheck, Calendar, User, GraduationCap, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Assignment {
  id: string;
  assigned_at: string;
  notes: string | null;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string;
  };
  supervisor: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export function RecentAssignments() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.department_id) {
      fetchRecentAssignments();
    }
  }, [profile?.department_id]);

  const fetchRecentAssignments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('supervisor_assignments')
        .select(`
          id,
          assigned_at,
          notes,
          student:profiles!supervisor_assignments_student_id_fkey(
            id,
            first_name,
            last_name,
            student_id,
            department_id
          ),
          supervisor:profiles!supervisor_assignments_supervisor_id_fkey(
            id,
            first_name,
            last_name
          )
        `)
        .eq('student.department_id', profile?.department_id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setAssignments((data as any) || []);
    } catch (error) {
      console.error('Error fetching recent assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return "Il y a moins d'une heure";
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    } else if (diffInHours < 48) {
      return "Hier";
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Attributions Récentes
          </CardTitle>
          <CardDescription>
            Dernières attributions d'encadreurs du département
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Attributions Récentes
        </CardTitle>
        <CardDescription>
          Dernières attributions d'encadreurs du département
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!assignments || assignments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            Aucune attribution récente
          </p>
        ) : (
          <div className="space-y-4">
            {(assignments || []).map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {assignment.student.first_name} {assignment.student.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.student.student_id}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(assignment.assigned_at)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <User className="h-3 w-3" />
                    <span>Encadreur:</span>
                    <span className="font-medium text-foreground">
                      {assignment.supervisor.first_name} {assignment.supervisor.last_name}
                    </span>
                  </div>
                  
                  {assignment.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
                      {assignment.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
