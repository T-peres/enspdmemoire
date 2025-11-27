import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, FileText, Calendar, MessageSquare } from 'lucide-react';

interface AssignedStudent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  student_id: string;
  department: string;
  theme_title?: string;
  theme_status?: string;
  last_meeting?: string;
  progress_status: 'en_cours' | 'en_retard' | 'soumis' | 'en_evaluation' | 'soutenu';
}

export function StudentsList() {
  const { user } = useAuth();
  const [students, setStudents] = useState<AssignedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadAssignedStudents();
    }
  }, [user?.id]);

  const loadAssignedStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('supervisor_assignments')
        .select(`
          student:profiles!student_id(
            id,
            first_name,
            last_name,
            email,
            student_id,
            department:departments(name)
          ),
          thesis_topics!student_id(
            title,
            status
          )
        `)
        .eq('supervisor_id', user!.id)
        .eq('is_active', true);

      if (error) throw error;

      const studentsData = data?.map(assignment => ({
        id: assignment.student.id,
        first_name: assignment.student.first_name,
        last_name: assignment.student.last_name,
        email: assignment.student.email,
        student_id: assignment.student.student_id,
        department: assignment.student.department?.name || 'N/A',
        theme_title: assignment.thesis_topics?.[0]?.title,
        theme_status: assignment.thesis_topics?.[0]?.status,
        progress_status: 'en_cours' as const,
      })) || [];

      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading assigned students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      en_cours: { label: 'En cours', variant: 'default' as const },
      en_retard: { label: 'En retard', variant: 'destructive' as const },
      soumis: { label: 'Soumis', variant: 'secondary' as const },
      en_evaluation: { label: 'En évaluation', variant: 'outline' as const },
      soutenu: { label: 'Soutenu', variant: 'default' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.en_cours;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Étudiants encadrés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Étudiants encadrés ({students.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun étudiant assigné pour le moment
          </p>
        ) : (
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">
                        {student.first_name} {student.last_name}
                      </h3>
                      {getStatusBadge(student.progress_status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {student.student_id} • {student.department}
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {student.email}
                    </p>
                    {student.theme_title && (
                      <p className="text-sm font-medium text-blue-600">
                        Sujet: {student.theme_title}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <FileText className="h-4 w-4 mr-1" />
                      Fiche
                    </Button>
                    <Button size="sm" variant="outline">
                      <Calendar className="h-4 w-4 mr-1" />
                      RDV
                    </Button>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}