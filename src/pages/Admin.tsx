import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, Shield, Plus, Pencil, Trash2 } from 'lucide-react';
import { Department, Profile, AppRole } from '@/types/database';

interface UserWithRoles extends Profile {
  user_roles: { role: AppRole }[];
  email?: string;
}

export default function Admin() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Department state
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentForm, setDepartmentForm] = useState({ name: '', code: '', description: '' });

  // User role state
  const [userRoleDialogOpen, setUserRoleDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('student');

  // Fetch departments
  const { data: departments = [], refetch: refetchDepartments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Department[];
    },
  });

  // Fetch users with roles
  const { data: users = [] } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name');
      
      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Fetch emails from auth (this won't work without admin privileges, so we'll skip it)
      const usersWithRoles = profiles.map(profile => {
        const userRoles = rolesData.filter(r => r.user_id === profile.id);
        return {
          ...profile,
          user_roles: userRoles.map(r => ({ role: r.role })),
          email: '' // We can't fetch emails without admin API access
        };
      });

      return usersWithRoles as UserWithRoles[];
    },
  });

  // Department mutations
  const createDepartmentMutation = useMutation({
    mutationFn: async (form: typeof departmentForm) => {
      const { error } = await supabase
        .from('departments')
        .insert([form]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Département créé avec succès' });
      setDepartmentDialogOpen(false);
      setDepartmentForm({ name: '', code: '', description: '' });
      refetchDepartments();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: typeof departmentForm }) => {
      const { error } = await supabase
        .from('departments')
        .update(form)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Département modifié avec succès' });
      setDepartmentDialogOpen(false);
      setEditingDepartment(null);
      setDepartmentForm({ name: '', code: '', description: '' });
      refetchDepartments();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Département supprimé avec succès' });
      refetchDepartments();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  // User role mutations
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First, remove all existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;

      // Then add the new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role }]);
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast({ title: 'Rôle modifié avec succès' });
      setUserRoleDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const handleDepartmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDepartment) {
      updateDepartmentMutation.mutate({ id: editingDepartment.id, form: departmentForm });
    } else {
      createDepartmentMutation.mutate(departmentForm);
    }
  };

  const handleEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setDepartmentForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    setDepartmentDialogOpen(true);
  };

  const handleUserRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserRoleMutation.mutate({ userId: selectedUserId, role: selectedRole });
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'admin': return 'default';
      case 'department_head': return 'secondary';
      case 'professor': return 'outline';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: AppRole) => {
    const labels: Record<AppRole, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      department_head: 'Chef de Département',
      professor: 'Professeur',
      student: 'Étudiant'
    };
    return labels[role];
  };

  if (!hasRole('admin') && !hasRole('super_admin')) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
          <p className="text-muted-foreground">Vous n'avez pas les permissions nécessaires.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Administration</h1>
          <p className="text-muted-foreground">Gérer les départements, utilisateurs et rôles</p>
        </div>

        <Tabs defaultValue="departments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="departments" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Départements
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gestion des Départements</CardTitle>
                    <CardDescription>Créer, modifier ou supprimer des départements</CardDescription>
                  </div>
                  <Dialog open={departmentDialogOpen} onOpenChange={(open) => {
                    setDepartmentDialogOpen(open);
                    if (!open) {
                      setEditingDepartment(null);
                      setDepartmentForm({ name: '', code: '', description: '' });
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nouveau Département
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleDepartmentSubmit}>
                        <DialogHeader>
                          <DialogTitle>
                            {editingDepartment ? 'Modifier le département' : 'Nouveau département'}
                          </DialogTitle>
                          <DialogDescription>
                            Remplissez les informations du département
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Nom</Label>
                            <Input
                              id="name"
                              value={departmentForm.name}
                              onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="code">Code</Label>
                            <Input
                              id="code"
                              value={departmentForm.code}
                              onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={departmentForm.description}
                              onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">
                            {editingDepartment ? 'Modifier' : 'Créer'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell>{dept.code}</TableCell>
                        <TableCell className="max-w-md truncate">{dept.description}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDepartment(dept)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer ce département ?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteDepartmentMutation.mutate(dept.id)}
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Utilisateurs et Rôles</CardTitle>
                <CardDescription>Attribuer des rôles aux utilisateurs</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Matricule</TableHead>
                      <TableHead>Rôles</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>{user.email || 'N/A'}</TableCell>
                        <TableCell>{user.matricule || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {user.user_roles.map((ur, idx) => (
                              <Badge key={idx} variant={getRoleBadgeVariant(ur.role)}>
                                {getRoleLabel(ur.role)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog open={userRoleDialogOpen && selectedUserId === user.id} onOpenChange={(open) => {
                            setUserRoleDialogOpen(open);
                            if (!open) setSelectedUserId('');
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                  setSelectedRole(user.user_roles[0]?.role || 'student');
                                  setUserRoleDialogOpen(true);
                                }}
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <form onSubmit={handleUserRoleSubmit}>
                                <DialogHeader>
                                  <DialogTitle>Modifier le rôle</DialogTitle>
                                  <DialogDescription>
                                    Changer le rôle de {user.first_name} {user.last_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="role">Rôle</Label>
                                    <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="student">Étudiant</SelectItem>
                                        <SelectItem value="professor">Professeur</SelectItem>
                                        <SelectItem value="department_head">Chef de Département</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button type="submit">Modifier</Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
