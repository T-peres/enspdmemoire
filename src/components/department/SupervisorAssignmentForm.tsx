import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSupervisorAssignments } from '@/hooks/useSupervisorAssignments';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { Loader2, UserPlus } from 'lucide-react';

export function SupervisorAssignmentForm() {
  const { assignSupervisor } = useSupervisorAssignments();
  const [students, setStudents] = useState<Profile[]>([]);
  const [supervisors, setSupervisors] = useState<Profile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [notes, setNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadUsers();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadUsers = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    try {
      // Récupérer le département du chef connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMountedRef.current) return;

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('department_id')
        .eq('id', user.id)
        .single();

      if (!isMountedRef.current) return;
      
      const departmentId = currentProfile?.department_id;

      console.log('🔍 DEBUG - Department ID:', departmentId);
      console.log('🔍 DEBUG - Current user:', user.id);

      // Charger les étudiants avec leurs rôles (du même département)
      const { data: studentRoles, error: studentError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (!isMountedRef.current) return;

      console.log('🔍 DEBUG - Student roles:', studentRoles);
      console.log('🔍 DEBUG - Student error:', studentError);

      if (studentError) {
        console.error('Error loading students:', studentError);
      } else if (studentRoles && studentRoles.length > 0) {
        const studentIds = studentRoles.map(r => r.user_id);
        let query = supabase
          .from('profiles')
          .select('*')
          .in('id', studentIds);
        
        // Filtrer par département si disponible
        if (departmentId) {
          query = query.eq('department_id', departmentId);
        }
        
        const { data: studentsData } = await query.order('last_name');
        console.log('🔍 DEBUG - Students data:', studentsData);
        if (studentsData && isMountedRef.current) {
          setStudents(studentsData);
          console.log('✅ Students set:', studentsData.length);
        }
      }

      // Charger les encadreurs avec leurs rôles (du même département)
      const { data: supervisorRoles, error: supervisorError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'supervisor');

      if (!isMountedRef.current) return;

      console.log('🔍 DEBUG - Supervisor roles:', supervisorRoles);
      console.log('🔍 DEBUG - Supervisor error:', supervisorError);

      if (supervisorError) {
        console.error('Error loading supervisors:', supervisorError);
      } else if (supervisorRoles && supervisorRoles.length > 0) {
        const supervisorIds = supervisorRoles.map(r => r.user_id);
        let query = supabase
          .from('profiles')
          .select('*')
          .in('id', supervisorIds);
        
        // Filtrer par département si disponible
        if (departmentId) {
          query = query.eq('department_id', departmentId);
        }
        
        const { data: supervisorsData } = await query.order('last_name');
        console.log('🔍 DEBUG - Supervisors data:', supervisorsData);
        if (supervisorsData && isMountedRef.current) {
          setSupervisors(supervisorsData);
          console.log('✅ Supervisors set:', supervisorsData.length);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedStudent || !selectedSupervisor || !isMountedRef.current) {
      console.log('⚠️ Formulaire incomplet:', { selectedStudent, selectedSupervisor });
      return;
    }

    console.log('📝 Soumission du formulaire:', { selectedStudent, selectedSupervisor, notes });
    setIsAssigning(true);
    
    try {
      await assignSupervisor.mutateAsync({
        studentId: selectedStudent,
        supervisorId: selectedSupervisor,
        notes: notes || undefined,
      });
      
      if (!isMountedRef.current) return;
      
      console.log('✅ Attribution réussie!');
      
      // Réinitialiser le formulaire
      setSelectedStudent('');
      setSelectedSupervisor('');
      setNotes('');
      
      // Recharger les utilisateurs pour mettre à jour la liste
      await loadUsers();
    } catch (error) {
      console.error('❌ Erreur lors de l\'attribution:', error);
    } finally {
      if (isMountedRef.current) {
        setIsAssigning(false);
      }
    }
  }, [selectedStudent, selectedSupervisor, notes, assignSupervisor, loadUsers]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attribuer un encadreur</CardTitle>
        <CardDescription>
          Assignez un encadreur à un étudiant pour son mémoire
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Chargement...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="student">Étudiant *</Label>
              <Select 
                value={selectedStudent} 
                onValueChange={setSelectedStudent}
                disabled={students.length === 0}
              >
                <SelectTrigger id="student">
                  <SelectValue placeholder={students.length === 0 ? "Aucun étudiant disponible" : "Sélectionner un étudiant"} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} ({student.student_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {students.length === 0 && !isLoading && (
                <p className="text-xs text-orange-600 mt-1">
                  Aucun étudiant avec le rôle "student" trouvé. Vérifiez la table user_roles.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="supervisor">Encadreur *</Label>
              <Select 
                value={selectedSupervisor} 
                onValueChange={setSelectedSupervisor}
                disabled={supervisors.length === 0}
              >
                <SelectTrigger id="supervisor">
                  <SelectValue placeholder={supervisors.length === 0 ? "Aucun encadreur disponible" : "Sélectionner un encadreur"} />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((supervisor) => (
                    <SelectItem key={supervisor.id} value={supervisor.id}>
                      {supervisor.first_name} {supervisor.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {supervisors.length === 0 && !isLoading && (
                <p className="text-xs text-orange-600 mt-1">
                  Aucun encadreur avec le rôle "supervisor" trouvé. Vérifiez la table user_roles.
                </p>
              )}
            </div>

          <div>
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez des notes sur cette attribution..."
              rows={3}
            />
          </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isAssigning || !selectedStudent || !selectedSupervisor || students.length === 0 || supervisors.length === 0}
              className="w-full"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Attribution en cours...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Attribuer l'encadreur
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
