import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SafeSelect } from '@/components/ui/SafeSelect';
import { User, Mail, Building2, Phone, Save, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function StudentProfile() {
  const { profile, refreshProfile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    matricule: '',
    department_id: '',
  });
  const [department, setDepartment] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        matricule: profile.matricule || '',
        department_id: profile.department_id || '',
      });
      setAvatarUrl(profile.avatar_url || null);
      fetchDepartment();
    }
  }, [profile]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Erreur lors du chargement des départements');
    }
  };

  const fetchDepartment = async () => {
    if (!profile?.department_id) return;

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', profile.department_id)
        .single();

      if (error) throw error;
      setDepartment(data);
    } catch (error) {
      console.error('Error fetching department:', error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La taille du fichier ne doit pas dépasser 2MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Seuls les fichiers image sont acceptés');
      return;
    }

    setUploading(true);

    try {
      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Photo de profil mise à jour');
      refreshProfile?.();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          matricule: formData.matricule,
          department_id: formData.department_id || null,
        })
        .eq('id', profile?.id);

      if (error) throw error;

      toast.success('Profil mis à jour');
      refreshProfile?.();
      // Refresh departments to avoid stale data
      await fetchDepartments();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const first = formData.first_name?.[0] || '';
    const last = formData.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-6 w-6" />
          Mon Profil
        </CardTitle>
        <CardDescription>
          Gérez vos informations personnelles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center pb-6 border-b">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          
          <Label htmlFor="avatar-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Téléchargement...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Changer la photo</span>
                </>
              )}
            </div>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
          </Label>
          <p className="text-xs text-muted-foreground mt-2">
            JPG, PNG ou GIF (max 2MB)
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">Prénom</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Nom</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-gray-50"
            />
          </div>
          <p className="text-xs text-gray-500">
            L'email ne peut pas être modifié
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+237 6XX XXX XXX"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="matricule">Matricule</Label>
          <Input
            id="matricule"
            value={formData.matricule}
            onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
            placeholder="Votre matricule"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Département</Label>
          <SafeSelect
            value={formData.department_id}
            onValueChange={(value) => setFormData({ ...formData, department_id: value })}
            placeholder="Sélectionnez votre département"
            options={departments.map((dept) => ({
              value: dept.id,
              label: `${dept.name} (${dept.code})`
            }))}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </CardContent>
    </Card>
  );
}
