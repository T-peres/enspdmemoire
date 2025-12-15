import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSupervisorAssignments } from '@/hooks/useSupervisorAssignments';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { Loader2, UserPlus } from 'lucide-react';
import { SafeForm, SafeSubmitButton, useSafeForm } from '@/components/ui/SafeForm';
import { SafeSelect, useSafeSelect } from '@/components/ui/SafeSelect';
import { toast } from 'sonner';

interface FormData {
  studentId: string;
  supervisorId: string;
  notes: string;
}

export function SupervisorAssignmentFormFixed() {
  const { assignSupervisor } = useSupervisorAssignments();
  const [students, setStudents] = useState<Profile[]>([]);
  const [supervisors, setSupervisors] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  // Utilisation du hook de formulaire sécurisé
  const form = useSafeForm<FormData>({
    studentId: '',
    supervisorId: '',
    notes: ''
  });

  // Utilisation des hooks de select sécurisés
  const studentSelect = useSafeSelect<string>('');
  const supervisorSelect = useSafeSelect<string>('');

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

      // Charger les étudiants avec leurs rôles (du même département)
      const { data: studentRoles, error: studentError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (!isMountedRef.current) return;

      if (studentError) {
        console.error('Error loading students:', studentError);
        toast.error('Erreur lors du chargement des étudiants');
      } else if (studentRoles && studentRoles.length > 0) {
        const studentIds = studentRoles.map(r => r.user_id);
        let query = supabase
          .from('profiles')
          .select('*')
          .in('id', studentIds);
        
        if (departmentId) {
          query = query.eq('department_id', departmentId);
        }
        
        const { data: studentsData } = await query.order('last_name');
        if (studentsData && isMountedRef.current) {
          setStudents(studentsData);
        }
      }

      // Charger les encadreurs avec leurs rôles (du même département)
      const { data: supervisorRoles, error: supervisorError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'supervisor');

      if (!isMountedRef.current) return;

      if (supervisorError) {
        console.error('Error loading supervisors:', supervisorError);
        toast.error('Erreur lors du chargement des encadreurs');
      } else if (supervisorRoles && supervisorRoles.length > 0) {
        const supervisorIds = supervisorRoles.map(r => r.user_id);
        let query = supabase
          .from('profiles')
          .select('*')
          .in('id', supervisorIds);
        
        if (departmentId) {
          query = query.eq('department_id', departmentId);
        }
        
        const { data: supervisorsData } = await query.order('last_name');
        if (supervisorsData && isMountedRef.current) {
          setSupervisors(supervisorsData);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Gestionnaire de soumission sécurisé
  const handleSubmit = useCallback(async () => {
    if (!studentSelect.value || !supervisorSelect.value) {
      toast.error('Veuillez sélectionner un étudiant et un encadreur');
      return;
    }

    // Validation
    const isValid = form.validate({
      studentId: (value) => !studentSelect.value ? 'Étudiant requis' : null,
      supervisorId: (value) => !supervisorSelect.value ? 'Encadreur requis' : null,
    });

    if (!isValid) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    form.setLoading(true);
    
    try {
      await assignSupervisor.mutateAsync({
        studentId: studentSelect.value,
        supervisorId: supervisorSelect.value,
        notes: form.values.notes || undefined,
      });
      
      if (!isMountedRef.current) return;
      
      toast.success('Attribution réussie !');
      
      // Réinitialiser le formulaire
      form.reset();
      studentSelect.reset();
      supervisorSelect.reset();
      
      // Recharger les utilisateurs pour mettre à jour la liste
      await loadUsers();
    } catch (error) {
      console.error('Erreur lors de l\'attribution:', error);
      toast.error('Erreur lors de l\'attribution');
    } finally {
      if (isMountedRef.current) {
        form.setLoading(false);
      }
    }
  }, [studentSelect.value, supervisorSelect.value, form, assignSupervisor, loadUsers]);

  // Préparer les options pour les selects
  const studentOptions = students.map(student => ({
    value: student.id,
    label: `${student.first_name} ${student.last_name} (${student.student_id})`,
  }));

  const supervisorOptions = supervisors.map(supervisor => ({
    value: supervisor.id,
    label: `${supervisor.first_name} ${supervisor.last_name}`,
  }));

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
          <SafeForm onSubmit={handleSubmit} className="space-y-4">
            {/* Select Étudiant Sécurisé */}
            <SafeSelect
              value={studentSelect.value}
              onValueChange={studentSelect.setValue}
              options={studentOptions}
              label="Étudiant"
              placeholder={students.length === 0 ? "Aucun étudiant disponible" : "Sélectionner un étudiant"}
              required
              disabled={students.length === 0}
              error={studentSelect.error}
              id="student-select"
            />
            {students.length === 0 && !isLoading && (
              <p className="text-xs text-orange-600 mt-1">
                Aucun étudiant avec le rôle "student" trouvé. Vérifiez la table user_roles.
              </p>
            )}

            {/* Select Encadreur Sécurisé */}
            <SafeSelect
              value={supervisorSelect.value}
              onValueChange={supervisorSelect.setValue}
              options={supervisorOptions}
              label="Encadreur"
              placeholder={supervisors.length === 0 ? "Aucun encadreur disponible" : "Sélectionner un encadreur"}
              required
              disabled={supervisors.length === 0}
              error={supervisorSelect.error}
              id="supervisor-select"
            />
            {supervisors.length === 0 && !isLoading && (
              <p className="text-xs text-orange-600 mt-1">
                Aucun encadreur avec le rôle "supervisor" trouvé. Vérifiez la table user_roles.
              </p>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={form.values.notes}
                onChange={(e) => form.setValue('notes', e.target.value)}
                placeholder="Ajoutez des notes sur cette attribution..."
                rows={3}
              />
            </div>

            {/* Bouton de soumission sécurisé */}
            <SafeSubmitButton
              onClick={handleSubmit}
              loading={form.loading}
              disabled={!studentSelect.hasValue || !supervisorSelect.hasValue || students.length === 0 || supervisors.length === 0}
              className="w-full"
              loadingText="Attribution en cours..."
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Attribuer l'encadreur
            </SafeSubmitButton>
          </SafeForm>
        )}
      </CardContent>
    </Card>
  );
}