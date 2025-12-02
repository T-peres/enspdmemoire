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
import { Plus, Loader2, Upload, FileText, X } from 'lucide-react';

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
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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
      console.error('Erreur chargement départements:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les départements',
        variant: 'destructive',
      });
    } else {
      console.log('Départements chargés dans ProposeTopicDialog:', data);
      setDepartments(data || []);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier la taille du fichier (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Erreur',
          description: 'Le fichier ne doit pas dépasser 10 MB',
          variant: 'destructive',
        });
        return;
      }

      // Vérifier le type de fichier
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Erreur',
          description: 'Format de fichier non supporté. Utilisez PDF, DOC, DOCX ou TXT',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const uploadFile = async (topicId: string): Promise<string | null> => {
    if (!selectedFile || !user) return null;

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${topicId}_${Date.now()}.${fileExt}`;
      const filePath = `topic-proposals/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      throw error;
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
      // Créer le sujet d'abord
      const { data: topicData, error: topicError } = await supabase
        .from('thesis_topics')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          department_id: formData.department_id,
          max_students: formData.max_students,
          proposed_by: user.id,
          status: 'pending', // En attente de validation
          supervisor_id: hasRole('professor') || hasRole('department_head') ? user.id : null,
        })
        .select()
        .single();

      if (topicError) throw topicError;

      // Upload du fichier si présent
      let filePath: string | null = null;
      if (selectedFile && topicData) {
        try {
          filePath = await uploadFile(topicData.id);
          
          // Mettre à jour le sujet avec le chemin du fichier
          if (filePath) {
            const { error: updateError } = await supabase
              .from('thesis_topics')
              .update({ attachment_path: filePath })
              .eq('id', topicData.id);

            if (updateError) {
              console.error('Error updating topic with file path:', updateError);
            }
          }
        } catch (uploadError: any) {
          console.error('File upload failed:', uploadError);
          toast({
            title: 'Avertissement',
            description: 'Le sujet a été créé mais le fichier n\'a pas pu être uploadé',
            variant: 'destructive',
          });
        }
      }

      toast({
        title: 'Succès',
        description: selectedFile 
          ? 'Votre sujet et le document ont été soumis avec succès'
          : 'Votre sujet a été soumis et est en attente de validation',
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        department_id: profile?.department_id || '',
        max_students: 1,
      });
      setSelectedFile(null);
      setUploadProgress(0);
      
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
              name="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Développement d'une application mobile pour..."
              maxLength={200}
              required
              autoComplete="off"
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
                onValueChange={(value) => {
                  console.log('Département sélectionné:', value);
                  setFormData({ ...formData, department_id: value });
                }}
                required
              >
                <SelectTrigger onClick={() => console.log('SelectTrigger cliqué, départements:', departments.length)}>
                  <SelectValue placeholder="Sélectionnez un département" />
                </SelectTrigger>
                <SelectContent>
                  {departments.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Chargement...</div>
                  ) : (
                    departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {departments.length} département(s) disponible(s)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_students">
                Nombre d'étudiants max <span className="text-destructive">*</span>
              </Label>
              <Input
                id="max_students"
                name="max_students"
                type="number"
                min={1}
                max={10}
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 1 })}
                required
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Entre 1 et 10 étudiants
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">
              Document joint (optionnel)
            </Label>
            <div className="space-y-3">
              {!selectedFile ? (
                <div className="flex items-center gap-2">
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Formats acceptés: PDF, DOC, DOCX, TXT (max 10 MB)
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
