import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Shield, Play, Info, AlertTriangle } from 'lucide-react';

interface PlagiarismCheckerProps {
  themeId: string;
  documents: any[];
  onSuccess?: () => void;
}

export function PlagiarismChecker({ themeId, documents, onSuccess }: PlagiarismCheckerProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');

  // Filtrer les documents approuvés ou en révision
  const eligibleDocuments = documents.filter(doc => 
    ['approved', 'under_review'].includes(doc.status)
  );

  const handleStartCheck = async () => {
    if (!profile || !selectedDocumentId) {
      toast.error('Veuillez sélectionner un document');
      return;
    }

    setLoading(true);

    try {
      // Créer un rapport de plagiat en attente
      const { error } = await supabase.from('plagiarism_reports').insert({
        theme_id: themeId,
        document_id: selectedDocumentId,
        student_id: profile.id,
        status: 'pending',
        threshold_used: 20, // Seuil par défaut de 20%
        requested_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Simuler le démarrage du processus (dans un vrai système, cela déclencherait un service externe)
      toast.success('Vérification anti-plagiat lancée. Vous recevrez une notification une fois terminée.');
      
      // Créer une notification pour informer que le processus a commencé
      await supabase.rpc('create_notification', {
        p_user_id: profile.id,
        p_title: 'Vérification Anti-Plagiat',
        p_message: 'La vérification anti-plagiat de votre document a été lancée. Vous recevrez les résultats sous peu.',
        p_type: 'info',
        p_entity_type: 'plagiarism_check',
      });

      setSelectedDocumentId('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error starting plagiarism check:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (eligibleDocuments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Vérification Anti-Plagiat
          </CardTitle>
          <CardDescription>
            Lancez une vérification manuelle de vos documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Aucun document éligible pour la vérification. Seuls les documents approuvés ou en cours de révision peuvent être vérifiés.
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
          <Shield className="h-5 w-5" />
          Vérification Anti-Plagiat
        </CardTitle>
        <CardDescription>
          Lancez une vérification manuelle de vos documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            La vérification compare votre document avec une base de données académique et web. 
            Le seuil de tolérance est fixé à 20%.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <label className="text-sm font-medium">Sélectionner un document</label>
          <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
            <SelectTrigger>
              <SelectValue placeholder="Choisissez un document à vérifier" />
            </SelectTrigger>
            <SelectContent>
              {eligibleDocuments.map((doc) => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.title} ({doc.document_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Cette vérification peut prendre plusieurs minutes. 
            Vous recevrez une notification une fois terminée.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleStartCheck}
          disabled={loading || !selectedDocumentId}
          className="w-full"
        >
          <Play className="h-4 w-4 mr-2" />
          {loading ? 'Lancement en cours...' : 'Lancer la vérification'}
        </Button>
      </CardContent>
    </Card>
  );
}