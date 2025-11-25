import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Department } from '@/types/database';
import { Plus, Loader2 } from 'lucide-react';

interface ProposeTopicDialogProps {
  onTopicProposed?: () => void;
}

export function ProposeTopicDialog({ onTopicProposed }: ProposeTopicDialogProps) {
  const { user, profile, hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department_id: '',
    max_students: 1,
  });

  useEffect(() => {
    if (open) {
      fetchDepartments();
      // Pre-fill department if user has one
      if (profile?.department_id) {
        setFormData(prev => ({ ...prev, department_id: profile.department_id || '' }));
      }
    }
  }, [open, profile]);

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    
    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les départements',
        variant: 'destructive',
      });
    } else {
      setDepartments(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!formData.title.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le titre est obligatoire',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.department_id) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un département',
        variant: 'destructive',
      });
      return;
    }

    if (formData.max_students < 1 || formData.max_students > 10) {
      toast({
        title: 'Erreur',
        description: 'Le nombre d\'étudiants doit être entre 1 et 10',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('thesis_topics')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          department_id: formData.department_id,
          max_students: formData.max_students,
          proposed_by: user.id,
          status: 'pending', // En attente de validation
          supervisor_id: hasRole('professor') || hasRole('department_head') ? user.id : null,
        });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Votre sujet a été soumis et est en attente de validation',
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        department_id: profile?.department_id || '',
        max_students: 1,
      });
      
      setOpen(false);
      onTopicProposed?.();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la proposition du sujet',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user can propose topics
  const canPropose = hasRole('student') || hasRole('professor') || hasRole('department_head') || hasRole('admin');

  if (!canPropose) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Proposer un sujet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proposer un nouveau sujet de mémoire</DialogTitle>
          <DialogDescription>
            Soumettez votre proposition de sujet. Elle sera examinée par le chef de département avant validation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Titre du sujet <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Développement d'une application mobile pour..."
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.title.length}/200 caractères
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez les objectifs, la problématique et les technologies envisagées..."
              rows={6}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/2000 caractères
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">
                Département <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.department_id}
                onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un département" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_students">
                Nombre d'étudiants max <span className="text-destructive">*</span>
              </Label>
              <Input
                id="max_students"
                type="number"
                min={1}
                max={10}
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 1 })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Entre 1 et 10 étudiants
              </p>
            </div>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Votre sujet sera soumis avec le statut "En attente" et devra être validé par le chef de département avant d'être visible aux étudiants.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                'Soumettre la proposition'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
