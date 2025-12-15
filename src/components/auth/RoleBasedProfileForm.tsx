import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SafeSelect } from '@/components/ui/SafeSelect';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Department } from '@/types/database';
import { Loader2, User, GraduationCap, Users, Shield } from 'lucide-react';

interface RoleBasedProfileFormProps {
  onSuccess?: () => void;
}

type UserRole = 'student' | 'supervisor' | 'department_head' | 'jury' | 'admin';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
  department_id: string;
  // Champs spécifiques étudiant
  student_id?: string;
  academic_year?: string;
  // Champs spécifiques encadreur
  specialization?: string;
  max_students?: number;
  // Champs spécifiques jury
  expertise_areas?: string[];
  // Champs spécifiques chef département
  management_start_date?: string;
}

const ROLE_ICONS = {
  student: GraduationCap,
  supervisor: User,
  department_head: Shield,
  jury: Users,
  admin: Shield,
};

const ROLE_LABELS = {
  student: 'Étudiant',
  supervisor: 'Encadreur',
  department_head: 'Chef de Département',
  jury: 'Membre du Jury',
  admin: 'Administrateur',
};

export function RoleBasedProfileForm({ onSuccess }: RoleBasedProfileFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    phone: '',
    department_id: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        department_id: profile.department_id || '',
        student_id: profile.student_id || '',
        academic_year: profile.academic_year || '',
        specialization: profile.specialization || '',
        max_students: profile.max_students || 5,
        expertise_areas: profile.expertise_areas || [],
        management_start_date: profile.management_start_date || '',
      });
    }
    fetchUserRoles();
    fetchDepartments();
  }, [profile]);

  const fetchUserRoles = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const roles = data?.map(r => r.role as UserRole) || [];
      setUserRoles(roles);
      
      if (roles.length > 0 && !roles.includes(selectedRole)) {
        setSelectedRole(roles[0]);
      }
    } catch (error: any) {
      console.error('Error fetching user roles:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les départements',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Préparer les données selon le rôle
      const updateData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        department_id: formData.department_id || null,
      };

      // Ajouter les champs spécifiques selon le rôle
      switch (selectedRole) {
        case 'student':
          updateData.student_id = formData.student_id;
          updateData.academic_year = formData.academic_year;
          break;
        case 'supervisor':
          updateData.specialization = formData.specialization;
          updateData.max_students = formData.max_students;
          break;
        case 'jury':
          updateData.expertise_areas = formData.expertise_areas;
          break;
        case 'department_head':
          updateData.management_start_date = formData.management_start_date;
          break;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Profil ${ROLE_LABELS[selectedRole]} mis à jour avec succès`,
      });

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderRoleSpecificFields = () => {
    switch (selectedRole) {
      case 'student':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="student_id">Matricule Étudiant</Label>
              <Input
                id="student_id"
                value={formData.student_id || ''}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                placeholder="Ex: 20IT001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="academic_year">Année Académique</Label>
              <SafeSelect
                value={formData.academic_year || ''}
                onValueChange={(value) => setFormData({ ...formData, academic_year: value })}
                placeholder="Sélectionnez l'année"
                options={[
                  { value: '2024-2025', label: '2024-2025' },
                  { value: '2025-2026', label: '2025-2026' },
                  { value: '2026-2027', label: '2026-2027' },
                ]}
              />
            </div>
          </>
        );

      case 'supervisor':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="specialization">Spécialisation</Label>
              <Textarea
                id="specialization"
                value={formData.specialization || ''}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="Décrivez vos domaines de spécialisation..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_students">Nombre Maximum d'Étudiants</Label>
              <Input
                id="max_students"
                type="number"
                min="1"
                max="20"
                value={formData.max_students || 5}
                onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) })}
              />
            </div>
          </>
        );

      case 'jury':
        return (
          <div className="space-y-2">
            <Label>Domaines d'Expertise</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Intelligence Artificielle',
                'Réseaux et Télécommunications',
                'Génie Logiciel',
                'Cybersécurité',
                'Systèmes Embarqués',
                'Base de Données',
                'Développement Web',
                'Mobile Development'
              ].map((area) => (
                <div key={area} className="flex items-center space-x-2">
                  <Checkbox
                    id={area}
                    checked={formData.expertise_areas?.includes(area) || false}
                    onCheckedChange={(checked) => {
                      const current = formData.expertise_areas || [];
                      if (checked) {
                        setFormData({ 
                          ...formData, 
                          expertise_areas: [...current, area] 
                        });
                      } else {
                        setFormData({ 
                          ...formData, 
                          expertise_areas: current.filter(a => a !== area) 
                        });
                      }
                    }}
                  />
                  <Label htmlFor={area} className="text-sm">{area}</Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'department_head':
        return (
          <div className="space-y-2">
            <Label htmlFor="management_start_date">Date de Prise de Fonction</Label>
            <Input
              id="management_start_date"
              type="date"
              value={formData.management_start_date || ''}
              onChange={(e) => setFormData({ ...formData, management_start_date: e.target.value })}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sélection du rôle */}
      {userRoles.length > 1 && (
        <div className="space-y-3">
          <Label>Configurer le profil pour le rôle :</Label>
          <div className="flex flex-wrap gap-2">
            {userRoles.map((role) => {
              const Icon = ROLE_ICONS[role];
              return (
                <Button
                  key={role}
                  type="button"
                  variant={selectedRole === role ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRole(role)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {ROLE_LABELS[role]}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Champs communs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">Prénom *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="Votre prénom"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Nom *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Votre nom"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+237 6XX XXX XXX"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Département *</Label>
          <SafeSelect
            value={formData.department_id}
            onValueChange={(value) => setFormData({ ...formData, department_id: value })}
            placeholder="Sélectionnez votre département"
            options={departments.map((dept) => ({
              value: dept.id,
              label: dept.name
            }))}
          />
        </div>

        {/* Champs spécifiques au rôle */}
        {renderRoleSpecificFields()}

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading} className="min-w-[150px]">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mise à jour...
              </>
            ) : (
              'Enregistrer le Profil'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}