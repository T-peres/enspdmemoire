import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentType } from '@/types/database';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface DocumentUploaderProps {
  themeId: string;
  onUploaded?: () => void;
  allowedTypes?: DocumentType[];
}

/**
 * Composant générique d'upload de documents
 * Gère l'upload avec validation, progression et feedback
 */
export function DocumentUploader({ themeId, onUploaded, allowedTypes }: DocumentUploaderProps) {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('plan');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  const documentTypeLabels: Record<DocumentType, string> = {
    plan: 'Plan du mémoire',
    chapter_1: 'Chapitre 1',
    chapter_2: 'Chapitre 2',
    chapter_3: 'Chapitre 3',
    chapter_4: 'Chapitre 4',
    final_version: 'Version finale',
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Vérifier le type de fichier
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (!allowedMimeTypes.includes(selectedFile.type)) {
        toast.error('Format de fichier non supporté. Utilisez PDF ou Word.');
        return;
      }

      // Vérifier la taille (max 20MB)
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 20 MB');
        return;
      }

      setFile(selectedFile);
      setUploadComplete(false);

      // Générer un titre par défaut si vide
      if (!title) {
        setTitle(`${documentTypeLabels[documentType]} - ${new Date().toLocaleDateString('fr-FR')}`);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !profile || !title.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simuler la progression (dans une vraie app, utilisez les événements de progression)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload du fichier
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${themeId}/${documentType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Créer l'entrée dans la base de données
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          theme_id: themeId,
          student_id: profile.id,
          document_type: documentType,
          title,
          file_path: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          status: 'submitted',
          version: 1,
          submitted_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadComplete(true);

      toast.success('Document téléchargé avec succès');

      // Réinitialiser le formulaire après un délai
      setTimeout(() => {
        setFile(null);
        setTitle('');
        setUploadProgress(0);
        setUploadComplete(false);
        onUploaded?.();
      }, 2000);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors du téléchargement');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const availableTypes = allowedTypes || [
    'plan',
    'chapter_1',
    'chapter_2',
    'chapter_3',
    'chapter_4',
    'final_version',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Télécharger un Document
        </CardTitle>
        <CardDescription>
          Formats acceptés: PDF, Word (max 20 MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadComplete ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Document téléchargé avec succès !
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="document-type">Type de document *</Label>
              <Select
                value={documentType}
                onValueChange={(v: DocumentType) => setDocumentType(v)}
                disabled={uploading}
              >
                <SelectTrigger id="document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {documentTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre du document *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Plan détaillé du mémoire"
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Fichier *</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span className="text-gray-400">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Téléchargement en cours...</span>
                  <span className="font-semibold">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Assurez-vous que votre document est complet et correctement formaté avant de le télécharger.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !title.trim()}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Téléchargement...' : 'Télécharger le Document'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
