import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Upload, 
  FileText, 
  Hash, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Info,
  ArrowRight
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DocumentUploadPanelProps {
  themeId: string;
  onSuccess?: () => void;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  theme_title: string;
  supervisor_name: string;
  student_progress: number;
}

interface DocumentStatus {
  next_allowed_document: string;
  overall_progress: number;
  plan_status?: string;
  chapter_1_status?: string;
  chapter_2_status?: string;
  chapter_3_status?: string;
  chapter_4_status?: string;
  final_version_status?: string;
}

interface Prerequisites {
  required_documents: string[];
  description: string;
  min_progress: number;
}

export function DocumentUploadPanelWithValidation({ themeId, onSuccess }: DocumentUploadPanelProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    document_type: 'plan',
    title: '',
    description: '',
  });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus | null>(null);
  const [prerequisites, setPrerequisites] = useState<Prerequisites | null>(null);

  // Charger le statut des documents de l'étudiant
  useEffect(() => {
    loadDocumentStatus();
  }, [themeId]);

  // Charger les prérequis quand le type de document change
  useEffect(() => {
    loadPrerequisites(formData.document_type);
  }, [formData.document_type]);

  const loadDocumentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('student_document_status')
        .select('*')
        .eq('theme_id', themeId)
        .single();

      if (error) throw error;
      setDocumentStatus(data);
      
      // Définir le type de document par défaut basé sur la prochaine étape
      if (data.next_allowed_document && data.next_allowed_document !== 'defense_ready') {
        setFormData(prev => ({ ...prev, document_type: data.next_allowed_document }));
      }
    } catch (error) {
      console.error('Error loading document status:', error);
    }
  };

  const loadPrerequisites = async (documentType: string) => {
    try {
      const { data, error } = await supabase.rpc('get_document_prerequisites', {
        p_document_type: documentType
      });

      if (error) throw error;
      setPrerequisites(data);
    } catch (error) {
      console.error('Error loading prerequisites:', error);
    }
  };

  const validateUpload = async () => {
    if (!profile || !file) return;

    setValidating(true);
    try {
      const { data, error } = await supabase.rpc('validate_document_upload', {
        p_student_id: profile.id,
        p_theme_id: themeId,
        p_document_type: formData.document_type,
        p_file_size: file.size
      });

      if (error) throw error;
      setValidation(data);
    } catch (error) {
      console.error('Error validating upload:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    if (file && formData.document_type) {
      validateUpload();
    }
  }, [file, formData.document_type]);

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
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Error generating file hash:', error);
      throw new Error('Impossible de générer le hash du fichier');
    }
  };

  const handleUpload = async () => {
    if (!profile || !file || !formData.title || !validation?.valid) {
      toast.error('Veuillez corriger les erreurs avant de continuer');
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
        description: formData.description || null,
        file_path: publicUrl,
        file_hash: fileHash,
        file_size: file.size,
        mime_type: file.type,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      toast.success('Document téléchargé avec succès');
      
      // Reset form
      setFile(null);
      setValidation(null);
      setFormData({
        document_type: 'plan',
        title: '',
        description: '',
      });

      // Recharger le statut
      loadDocumentStatus();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'submitted': 
      case 'under_review': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected': 
      case 'revision_requested': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved': return <Badge variant="default" className="bg-green-600">Approuvé</Badge>;
      case 'submitted': return <Badge variant="outline" className="border-blue-600 text-blue-600">Soumis</Badge>;
      case 'under_review': return <Badge variant="outline" className="border-yellow-600 text-yellow-600">En révision</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejeté</Badge>;
      case 'revision_requested': return <Badge variant="outline" className="border-orange-600 text-orange-600">Révision demandée</Badge>;
      default: return <Badge variant="secondary">Non soumis</Badge>;
    }
  };

  const isDocumentTypeAllowed = (type: string) => {
    if (!documentStatus) return false;
    
    const allowedTypes = ['plan'];
    if (documentStatus.plan_status === 'approved') allowedTypes.push('chapter_1');
    if (documentStatus.chapter_1_status === 'approved') allowedTypes.push('chapter_2');
    if (documentStatus.chapter_2_status === 'approved') allowedTypes.push('chapter_3');
    if (documentStatus.chapter_3_status === 'approved') allowedTypes.push('chapter_4');
    if (documentStatus.chapter_4_status === 'approved') allowedTypes.push('final_version');
    
    return allowedTypes.includes(type);
  };

  return (
    <div className="space-y-6">
      {/* Statut des documents */}
      {documentStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Progression des Documents
            </CardTitle>
            <CardDescription>
              Suivi de vos soumissions et validations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progrès global</span>
                <span>{documentStatus.overall_progress}%</span>
              </div>
              <Progress value={documentStatus.overall_progress} className="h-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(documentStatus.plan_status)}
                    <span className="text-sm">Plan détaillé</span>
                  </div>
                  {getStatusBadge(documentStatus.plan_status)}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(documentStatus.chapter_1_status)}
                    <span className="text-sm">Chapitre 1</span>
                  </div>
                  {getStatusBadge(documentStatus.chapter_1_status)}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(documentStatus.chapter_2_status)}
                    <span className="text-sm">Chapitre 2</span>
                  </div>
                  {getStatusBadge(documentStatus.chapter_2_status)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(documentStatus.chapter_3_status)}
                    <span className="text-sm">Chapitre 3</span>
                  </div>
                  {getStatusBadge(documentStatus.chapter_3_status)}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(documentStatus.chapter_4_status)}
                    <span className="text-sm">Chapitre 4</span>
                  </div>
                  {getStatusBadge(documentStatus.chapter_4_status)}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(documentStatus.final_version_status)}
                    <span className="text-sm">Version finale</span>
                  </div>
                  {getStatusBadge(documentStatus.final_version_status)}
                </div>
              </div>
            </div>

            {documentStatus.next_allowed_document !== 'defense_ready' && (
              <Alert>
                <ArrowRight className="h-4 w-4" />
                <AlertDescription>
                  <strong>Prochaine étape :</strong> Vous pouvez maintenant déposer votre{' '}
                  <span className="font-semibold">
                    {documentStatus.next_allowed_document === 'plan' ? 'plan détaillé' :
                     documentStatus.next_allowed_document === 'chapter_1' ? 'chapitre 1' :
                     documentStatus.next_allowed_document === 'chapter_2' ? 'chapitre 2' :
                     documentStatus.next_allowed_document === 'chapter_3' ? 'chapitre 3' :
                     documentStatus.next_allowed_document === 'chapter_4' ? 'chapitre 4' :
                     documentStatus.next_allowed_document === 'final_version' ? 'version finale' :
                     documentStatus.next_allowed_document}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {documentStatus.next_allowed_document === 'defense_ready' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Félicitations !</strong> Tous vos documents sont approuvés. Vous pouvez maintenant planifier votre soutenance.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulaire d'upload */}
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
          {/* Prérequis */}
          {prerequisites && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Prérequis :</strong> {prerequisites.description}
                {prerequisites.min_progress > 0 && (
                  <span className="block mt-1">
                    Progrès minimum requis : {prerequisites.min_progress}%
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

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
                <SelectItem value="plan" disabled={!isDocumentTypeAllowed('plan')}>
                  Plan détaillé {!isDocumentTypeAllowed('plan') && '(Non disponible)'}
                </SelectItem>
                <SelectItem value="chapter_1" disabled={!isDocumentTypeAllowed('chapter_1')}>
                  Chapitre 1 {!isDocumentTypeAllowed('chapter_1') && '(Non disponible)'}
                </SelectItem>
                <SelectItem value="chapter_2" disabled={!isDocumentTypeAllowed('chapter_2')}>
                  Chapitre 2 {!isDocumentTypeAllowed('chapter_2') && '(Non disponible)'}
                </SelectItem>
                <SelectItem value="chapter_3" disabled={!isDocumentTypeAllowed('chapter_3')}>
                  Chapitre 3 {!isDocumentTypeAllowed('chapter_3') && '(Non disponible)'}
                </SelectItem>
                <SelectItem value="chapter_4" disabled={!isDocumentTypeAllowed('chapter_4')}>
                  Chapitre 4 {!isDocumentTypeAllowed('chapter_4') && '(Non disponible)'}
                </SelectItem>
                <SelectItem value="final_version" disabled={!isDocumentTypeAllowed('final_version')}>
                  Version Finale {!isDocumentTypeAllowed('final_version') && '(Non disponible)'}
                </SelectItem>
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

          {/* Résultats de validation */}
          {validating && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>Validation en cours...</AlertDescription>
            </Alert>
          )}

          {validation && (
            <div className="space-y-2">
              {validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erreurs :</strong>
                    <ul className="list-disc list-inside mt-1">
                      {validation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validation.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Avertissements :</strong>
                    <ul className="list-disc list-inside mt-1">
                      {validation.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validation.valid && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Validation réussie !</strong> Le document peut être téléchargé.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Alert>
            <Hash className="h-4 w-4" />
            <AlertDescription>
              Un hash SHA-256 sera généré automatiquement pour garantir l'intégrité et l'authenticité de votre document.
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Assurez-vous que votre document est complet et relu avant de le soumettre. 
              Un contrôle anti-plagiat sera effectué automatiquement.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleUpload}
            disabled={loading || !file || !formData.title || !validation?.valid}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {loading ? 'Téléchargement en cours...' : 'Télécharger le document'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}