import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Loader2, User } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SupervisorDetailsDialogProps {
  supervisorId: string;
  supervisorName: string;
}

interface StudentAssignment {
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  student_email: string;
  theme_title?: string;
  theme_status?: string;
  overall_progress?: number;
  assigned_at: string;
}

export function SupervisorDetailsDialog({ supervisorId, supervisorName }: SupervisorDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadStudents();
    }
  }, [open, supervisorId]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      // Récupérer les attributions actives
      const { data: assignments, error: assignError } = await supabase
        .from('supervisor_assignments')
        .select(`
          student_id,
          assigned_at,
          student:profiles!student_id(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('supervisor_id', supervisorId)
        .eq('is_active', true);

      if (assignError) throw assignError;

      // Pour chaque étudiant, récupérer son thème et sa progression
      const studentsWithDetails = await Promise.all(
        (assignments || []).map(async (assignment: any) => {
          // Récupérer le thème
          const { data: theme } = await supabase
            .from('themes')
            .select('title, status')
            .eq('student_id', assignment.student_id)
            .eq('supervisor_id', supervisorId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Récupérer la fiche de suivi
          const { data: fiche } = await supabase
            .from('fiche_suivi')
            .select('overall_progress')
            .eq('student_id', assignment.student_id)
            .eq('supervisor_id', supervisorId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            student_id: assignment.student.id,
            student_first_name: assignment.student.first_name,
            student_last_name: assignment.student.last_name,
            student_email: assignment.student.email,
            theme_title: theme?.title,
            theme_status: theme?.status,
            overall_progress: fiche?.overall_progress,
            assigned_at: assignment.assigned_at,
          };
        })
      );

      setStudents(studentsWithDetails);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">Aucun thème</Badge>;
    
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approuvé</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">En attente</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejeté</Badge>;
      case 'revision_requested':
        return <Badge className="bg-orange-500">Révision</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          Détails
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Étudiants de {supervisorName}</DialogTitle>
          <DialogDescription>
            Liste des étudiants assignés à cet encadreur
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun étudiant assigné</p>
          </div>
        ) : (
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.student_id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-lg">
                      {student.student_first_name} {student.student_last_name}
                    </p>
                    <p className="text-sm text-gray-500">{student.student_email}</p>
                  </div>
                  {getStatusBadge(student.theme_status)}
                </div>

                {student.theme_title && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Thème :</p>
                    <p className="text-sm text-gray-600">{student.theme_title}</p>
                  </div>
                )}

                {student.overall_progress !== undefined && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Progression</span>
                      <span className="text-sm text-gray-600">{student.overall_progress}%</span>
                    </div>
                    <Progress value={student.overall_progress} className="h-2" />
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-3">
                  Assigné le {new Date(student.assigned_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
