import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Archive, Upload, FileCheck, AlertCircle } from 'lucide-react';

interface ArchiveSubmissionFormProps {
  themeId: string;
  onSubmitted?: () => void;
}

/**
 * Formulaire de soumission pour archivage
 * Permet de soumettre la version finale pour archivage institutionnel
 */
export function ArchiveSubmissionForm({ themeId, onSubmitted }: ArchiveSubmissionFormProps) {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [accessLevel, setAccessLevel] = useState<'public' | 'restricted' | 'private'>('public');
  const [publishOnline, setPublishOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [isEligible, setIsEligible] = useState(false);

  const checkEligibility = async () => {
    try {
      // Vérifier que le mémoire est validé par le jury
      const { data: juryDecision, error: juryError } = await supabase
        .from('jury_decisions')
        .select('decision, corrections_required, corrections_completed')
        .eq('theme_id', themeId)
        .single();

      if (juryError) {
        toast.error('Aucune décision de jury trouvée');
        setIsEligible(false);
        setEligibilityChecked(true);
        return;
      }

      // Vérifier que le mémoire est approuvé et que les corrections sont faites si nécessaires
      const eligible = juryDecision.decision === 'approved' &&
        (!juryDecision.corrections_required || juryDecision.corrections_completed);

      setIsEligible(eligible);
      setEligibilityChecked(true);

      if (!eligible) {
        toast.error('Le mémoire doit être approuvé par le jury avant archivage');
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      toast.error('Erreur lors de la vérification');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Vérifier que c'est un PDF
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Seuls les fichiers PDF sont acceptés');
        return;
      }
      // Vérifier la taille (max 50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 50 MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file || !profile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    if (!isEligible) {
      toast.error('Le mémoire n\'est pas éligible pour l\'archivage');
      return;
    }

    setLoading(true);

    try {
      // Upload du fichier
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${themeId}/final_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('archives')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('archives')
        .getPublicUrl(fileName);

      // Calculer le checksum (simple hash pour l'exemple)
      const checksum = await calculateChecksum(file);

      // Créer l'entrée d'archive
      const { error: archiveError } = await supabase
        .from('archives')
        .insert({
          theme_id: themeId,
          student_id: profile.id,
          final_document_path: publicUrl,
          file_size: file.size,
          checksum,
          status: 'pending',
          access_level: accessLevel,
          published: publishOnline,
          metadata: {
            original_filename: file.name,
            mime_type: file.type,
            submitted_at: new Date().toISOString(),
          },
        });

      if (archiveError) throw archiveError;

      toast.success('Document soumis pour archivage avec succès');
      
      // Réinitialiser le formulaire
      setFile(null);
      setAccessLevel('public');
      setPublishOnline(true);
      
      onSubmitted?.();
    } catch (error) {
      console.error('Error submitting for archive:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const calculateChecksum = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  if (!eligibilityChecked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archivage Institutionnel
          </CardTitle>
          <CardDescription>
            Soumettez votre mémoire pour archivage permanent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={checkEligibility} className="w-full">
            <FileCheck className="mr-2 h-4 w-4" />
            Vérifier l'Éligibilité
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isEligible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archivage Institutionnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Votre mémoire n'est pas encore éligible pour l'archivage.
              Il doit être approuvé par le jury et toutes les corrections doivent être complétées.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Archivage Institutionnel
        </CardTitle>
        <CardDescription>
          Soumettez votre version finale pour archivage permanent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <FileCheck className="h-4 w-4" />
          <AlertDescription>
            Votre mémoire est éligible pour l'archivage. Veuillez soumettre la version finale au format PDF/A.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="file">Document Final (PDF) *</Label>
          <Input
            id="file"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={loading}
          />
          {file && (
            <p className="text-sm text-gray-600">
              Fichier sélectionné: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="access">Niveau d'accès *</Label>
          <Select value={accessLevel} onValueChange={(v: any) => setAccessLevel(v)}>
            <SelectTrigger id="access">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public - Accessible à tous</SelectItem>
              <SelectItem value="restricted">Restreint - Membres de l'institution uniquement</SelectItem>
              <SelectItem value="private">Privé - Accès sur demande</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="publish"
            checked={publishOnline}
            onCheckedChange={(checked) => setPublishOnline(checked as boolean)}
          />
          <Label htmlFor="publish" className="cursor-pointer">
            Publier en ligne dans la bibliothèque numérique
          </Label>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900">
          <p className="font-semibold mb-1">Important :</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Le document doit être au format PDF/A pour l'archivage à long terme</li>
            <li>Assurez-vous que toutes les corrections du jury sont intégrées</li>
            <li>L'archivage est permanent et ne peut pas être annulé</li>
          </ul>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !file}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          {loading ? 'Soumission en cours...' : 'Soumettre pour Archivage'}
        </Button>
      </CardContent>
    </Card>
  );
}
