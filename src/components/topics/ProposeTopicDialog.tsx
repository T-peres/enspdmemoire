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
import { Plus, Loader2, Upload, FileText, X, Users } from 'lucide-react';

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Proposer un nouveau sujet de mémoire</DialogTitle>
          <DialogDescription className="text-base">
            Soumettez votre proposition de sujet. Elle sera examinée par le chef de département avant validation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 mt-6">
          {/* Section 1: Informations principales */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Informations du sujet</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-medium">
                Titre du sujet <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Développement d'une application mobile pour la gestion des stocks"
                maxLength={200}
                required
                autoComplete="off"
                className="text-base h-11"
              />
              <p className="text-xs text-muted-foreground flex justify-between">
                <span>Soyez précis et descriptif</span>
                <span className={formData.title.length > 180 ? 'text-orange-600 font-medium' : ''}>
                  {formData.title.length}/200
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium">
                Description détaillée
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez en détail :&#10;• La problématique à résoudre&#10;• Les objectifs du projet&#10;• Les technologies ou méthodologies envisagées&#10;• Les livrables attendus"
                rows={8}
                maxLength={2000}
                className="text-base resize-none"
              />
              <p className="text-xs text-muted-foreground flex justify-between">
                <span>Plus votre description est détaillée, mieux c'est</span>
                <span className={formData.description.length > 1800 ? 'text-orange-600 font-medium' : ''}>
                  {formData.description.length}/2000
                </span>
              </p>
            </div>
          </div>

          {/* Section 2: Paramètres */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Paramètres</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="department" className="text-base font-medium">
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
                  <SelectTrigger className="h-11" onClick={() => console.log('SelectTrigger cliqué, départements:', departments.length)}>
                    <SelectValue placeholder="Sélectionnez un département" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Chargement...</div>
                    ) : (
                      departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{dept.code}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{dept.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {departments.length > 0 ? `${departments.length} département(s) disponible(s)` : 'Chargement...'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_students" className="text-base font-medium">
                  Nombre d'étudiants maximum <span className="text-destructive">*</span>
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
                  className="h-11 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Combien d'étudiants peuvent travailler sur ce sujet ? (1-10)
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Document joint */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Upload className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Document complémentaire (optionnel)</h3>
            </div>

            <div className="space-y-3">
              {!selectedFile ? (
                <div className="border-2 border-dashed rounded-lg p-6 hover:border-primary/50 transition-colors">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="file" className="cursor-pointer text-base font-medium hover:text-primary">
                        Cliquez pour sélectionner un fichier
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        ou glissez-déposez votre document ici
                      </p>
                    </div>
                    <Input
                      id="file"
                      name="file"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      disabled={loading}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, DOCX, TXT • Maximum 10 MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeFile}
                      disabled={loading}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Note importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-blue-900">À propos de la validation</p>
                <p className="text-sm text-blue-800">
                  Votre proposition sera soumise avec le statut <strong>"En attente"</strong> et devra être validée par le chef de département avant d'être visible aux étudiants. Vous serez notifié de la décision.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="min-w-[100px]"
            >
              Annuler
            </Button>
            <Button 
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="min-w-[180px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Soumettre la proposition
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
