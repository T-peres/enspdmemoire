import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, GraduationCap, BookOpen, Calendar } from 'lucide-react';

interface StudentProfileProps {
  student: {
    id: string;
    name: string;
    email: string;
    matricule: string;
    department: string;
    promotion: string;
    theme_title?: string;
    theme_status?: string;
    enrollment_date: string;
  };
}

export function StudentProfile({ student }: StudentProfileProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profil Étudiant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{student.name}</h3>
              <p className="text-sm text-muted-foreground">{student.email}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                <span>Matricule: {student.matricule}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>Département: {student.department}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Promotion: {student.promotion}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Inscription: {new Date(student.enrollment_date).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
            
            {student.theme_title && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Thème:</span>
                  <Badge variant={getStatusColor(student.theme_status)}>
                    {student.theme_status || 'Non défini'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{student.theme_title}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}