import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, FileText, Hash, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DocumentUploadPanelProps {
  themeId: string;
  onSuccess?: () => void;
}

export function DocumentUploadPanel({ themeId, onSuccess }: DocumentUploadPanelProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    document_type: 'plan',
    title: '',
    description: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Seuls les fichiers PDF sont acceptés');
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 50 MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const generateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleUpload = async () => {
    if (!profile || !file || !formData.title) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      // Générer le hash du fichier
      const fileHash = await generateFileHash(file);

      // Upload du fichier vers Supabase Storage
      const fileName = `${profile.id}/${themeId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Créer l'enregistrement du document
      const { error: dbError } = await supabase.from('documents').insert({
        theme_id: themeId,
        student_id: profile.id,
        document_type: formData.document_type,
        title: formData.title,
        file_path: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        status: 'submitted',
      });

      if (dbError) throw dbError;

      // Créer une notification pour l'encadreur
      const { data: theme } = await supabase
        .from('thesis_topics')
        .select('supervisor_id')
        .eq('id', themeId)
        .single();

      if (theme?.supervisor_id) {
        await supabase.rpc('create_notification', {
          p_user_id: theme.supervisor_id,
          p_title: 'Nouveau Document Soumis',
          p_message: `${profile.first_name} ${profile.last_name} a soumis un nouveau document: ${formData.title}`,
          p_type: 'info',
          p_entity_type: 'document',
        });
      }

      toast.success('Document téléchargé avec succès');
      
      // Reset form
      setFile(null);
      setFormData({
        document_type: 'plan',
        title: '',
        description: '',
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Déposer un Document
        </CardTitle>
        <CardDescription>
          Téléchargez votre rapport ou un chapitre pour révision
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Hash className="h-4 w-4" />
          <AlertDescription>
            Un hash SHA-256 sera généré automatiquement pour garantir l'intégrité et l'authenticité de votre document.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="document_type">Type de document *</Label>
          <Select
            value={formData.document_type}
            onValueChange={(value) => setFormData({ ...formData, document_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plan">Plan détaillé</SelectItem>
              <SelectItem value="chapter_1">Chapitre 1</SelectItem>
              <SelectItem value="chapter_2">Chapitre 2</SelectItem>
              <SelectItem value="chapter_3">Chapitre 3</SelectItem>
              <SelectItem value="chapter_4">Chapitre 4</SelectItem>
              <SelectItem value="final_version">Version Finale</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Titre du document *</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Plan détaillé du mémoire"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optionnel)</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ajoutez des notes ou commentaires sur ce document..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">Fichier PDF *</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={loading}
          />
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{file.name}</span>
              <span>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
          )}
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Assurez-vous que votre document est complet et relu avant de le soumettre. 
            Un contrôle anti-plagiat sera effectué automatiquement.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleUpload}
          disabled={loading || !file || !formData.title}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {loading ? 'Téléchargement en cours...' : 'Télécharger le document'}
        </Button>
      </CardContent>
    </Card>
  );
}
