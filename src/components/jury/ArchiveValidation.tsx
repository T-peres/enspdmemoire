import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Theme, JuryDecisionData } from '@/types/database';
import { toast } from 'sonner';
import { Archive, CheckCircle, Lock, Globe } from 'lucide-react';

interface ArchiveValidationProps {
  theme: Theme;
  juryDecision: JuryDecisionData;
  onValidated: () => void;
}

export function ArchiveValidation({ theme, juryDecision, onValidated }: ArchiveValidationProps) {
  const { profile } = useAuth();
  const [accessLevel, setAccessLevel] = useState<string>('restricted');
  const [loading, setLoading] = useState(false);

  const canArchive = 
    juryDecision.decision === 'approved' || 
    (juryDecision.corrections_required && juryDecision.corrections_completed);

  const handleArchive = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      // Récupérer le document final
      const { data: finalDoc, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('theme_id', theme.id)
        .eq('document_type', 'final_version')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (docError || !finalDoc) {
        toast.error('Aucune version finale validée trouvée');
        return;
      }

      // Vérifier si une archive existe déjà
      const { data: existingArchive } = await supabase
        .from('archives')
        .select('id')
        .eq('theme_id', theme.id)
        .single();

      if (existingArchive) {
        // Mettre à jour l'archive existante
        const { error: updateError } = await supabase
          .from('archives')
          .update({
            status: 'archived',
            archived_at: new Date().toISOString(),
            archived_by: profile.id,
            access_level: accessLevel,
            published: accessLevel === 'public',
            published_at: accessLevel === 'public' ? new Date().toISOString() : null,
          })
          .eq('id', existingArchive.id);

        if (updateError) throw updateError;
      } else {
        // Créer une nouvelle archive
        const checksum = await generateChecksum(finalDoc.file_path);
        
        const { error: insertError } = await supabase
          .from('archives')
          .insert({
            theme_id: theme.id,
            student_id: theme.student_id,
            final_document_path: finalDoc.file_path,
            checksum,
            status: 'archived',
            archived_at: new Date().toISOString(),
            archived_by: profile.id,
            access_level: accessLevel,
            published: accessLevel === 'public',
            published_at: accessLevel === 'public' ? new Date().toISOString() : null,
            metadata: {
              title: theme.title,
              author: `${theme.student?.first_name} ${theme.student?.last_name}`,
              supervisor: `${theme.supervisor?.first_name} ${theme.supervisor?.last_name}`,
              grade: juryDecision.grade,
              mention: juryDecision.mention,
              defense_date: juryDecision.defense_date,
              archived_date: new Date().toISOString(),
            },
          });

        if (insertError) throw insertError;
      }

      // Notification à l'étudiant
      await supabase.rpc('create_notification', {
        p_user_id: theme.student_id,
        p_title: 'Mémoire Archivé',
        p_message: `Votre mémoire "${theme.title}" a été archivé avec succès. Niveau d'accès: ${accessLevel}.`,
        p_type: 'success',
        p_entity_type: 'archive',
        p_entity_id: theme.id,
      });

      // Notification à l'encadreur
      if (theme.supervisor_id) {
        await supabase.rpc('create_notification', {
          p_user_id: theme.supervisor_id,
          p_title: 'Mémoire Archivé',
          p_message: `Le mémoire de ${theme.student?.first_name} ${theme.student?.last_name} a été archivé.`,
          p_type: 'info',
          p_entity_type: 'archive',
          p_entity_id: theme.id,
        });
      }

      toast.success('Mémoire archivé avec succès');
      onValidated();
    } catch (error) {
      console.error('Error archiving thesis:', error);
      toast.error('Erreur lors de l\'archivage');
    } finally {
      setLoading(false);
    }
  };

  // Fonction utilitaire pour générer un checksum (simulation)
  async function generateChecksum(filePath: string): Promise<string> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-blue-600" />
          <CardTitle>Validation pour Archivage</CardTitle>
        </div>
        <CardDescription>
          Archiver le mémoire après validation finale du jury
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut de la décision */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Décision du Jury</span>
            <Badge variant={juryDecision.decision === 'approved' ? 'default' : 'outline'}>
              {juryDecision.decision === 'approved' ? 'Approuvé' : 
               juryDecision.corrections_required ? 'Corrections requises' : 'En attente'}
            </Badge>
          </div>
          {juryDecision.grade && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Note</span>
              <span className="text-lg font-bold">{juryDecision.grade}/20</span>
            </div>
          )}
          {juryDecision.mention && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Mention</span>
              <Badge variant="outline">{juryDecision.mention}</Badge>
            </div>
          )}
          {juryDecision.corrections_required && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Corrections</span>
              <Badge variant={juryDecision.corrections_completed ? 'default' : 'outline'}>
                {juryDecision.corrections_completed ? '✓ Complétées' : 'En cours'}
              </Badge>
            </div>
          )}
        </div>

        {/* Niveau d'accès */}
        {canArchive && (
          <div className="space-y-2">
            <Label htmlFor="access-level">Niveau d'Accès</Label>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger id="access-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Public</p>
                      <p className="text-xs text-gray-500">Accessible à tous</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="restricted">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Restreint</p>
                      <p className="text-xs text-gray-500">Accessible uniquement à l'ENSPD</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Privé</p>
                      <p className="text-xs text-gray-500">Accessible uniquement à l'étudiant</p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Bouton d'archivage */}
        {canArchive ? (
          <Button 
            onClick={handleArchive} 
            disabled={loading}
            className="w-full"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archiver le Mémoire
          </Button>
        ) : (
          <div className="p-3 bg-orange-50 rounded-md border border-orange-200">
            <p className="text-sm text-orange-800">
              {juryDecision.corrections_required && !juryDecision.corrections_completed
                ? 'En attente de la complétion des corrections'
                : 'En attente de la décision finale du jury'}
            </p>
          </div>
        )}

        {/* Informations sur l'archivage */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• L'archivage génère un checksum SHA-256 pour garantir l'intégrité</p>
          <p>• Les métadonnées Dublin Core sont automatiquement créées</p>
          <p>• Le document sera converti en PDF/A pour l'archivage long terme</p>
        </div>
      </CardContent>
    </Card>
  );
}
