import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FicheSuivi } from '@/types/database';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface WorkflowValidationPanelProps {
  fiche: FicheSuivi;
  onValidated: () => void;
}

export function WorkflowValidationPanel({ fiche, onValidated }: WorkflowValidationPanelProps) {
  const { profile } = useAuth();
  const [comments, setComments] = useState(fiche.department_head_comments || '');
  const [loading, setLoading] = useState(false);

  const canValidate = fiche.supervisor_validated && !fiche.department_head_validated;

  const handleValidate = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('fiche_suivi')
        .update({
          department_head_validated: true,
          department_head_validation_date: new Date().toISOString(),
          department_head_comments: comments || null,
        })
        .eq('id', fiche.id);

      if (error) throw error;

      // Notification à l'encadreur
      await supabase.rpc('create_notification', {
        p_user_id: fiche.supervisor_id,
        p_title: 'Fiche de Suivi Validée',
        p_message: `Le Chef de Département a validé la fiche de suivi de ${fiche.student?.first_name} ${fiche.student?.last_name}.`,
        p_type: 'success',
        p_entity_type: 'fiche_suivi',
        p_entity_id: fiche.id,
      });

      // Notification à l'étudiant
      await supabase.rpc('create_notification', {
        p_user_id: fiche.student_id,
        p_title: 'Évolution Validée',
        p_message: `Le Chef de Département a validé votre évolution. Vous pouvez continuer vers les étapes suivantes.`,
        p_type: 'success',
        p_entity_type: 'fiche_suivi',
        p_entity_id: fiche.id,
      });

      toast.success('Fiche de suivi validée avec succès');
      onValidated();
    } catch (error) {
      console.error('Error validating fiche:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Validation du Chef de Département</CardTitle>
            <CardDescription>
              Étudiant: {fiche.student?.first_name} {fiche.student?.last_name}
            </CardDescription>
          </div>
          {fiche.department_head_validated ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Validé
            </Badge>
          ) : fiche.supervisor_validated ? (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              <Clock className="h-3 w-3 mr-1" />
              En attente
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-50">
              <AlertCircle className="h-3 w-3 mr-1" />
              Non prêt
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Résumé de la progression */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Progression Globale</p>
            <p className="text-2xl font-bold">{fiche.overall_progress}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Validation Encadreur</p>
            <p className="text-lg font-medium">
              {fiche.supervisor_validated ? (
                <span className="text-green-600">✓ Validé</span>
              ) : (
                <span className="text-orange-600">En attente</span>
              )}
            </p>
          </div>
        </div>

        {/* Détails des chapitres */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Progression par Chapitre</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Plan</span>
              <span className="font-medium">{fiche.plan_approved ? '✓' : '○'}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Chapitre 1</span>
              <span className="font-medium">{fiche.chapter_1_progress}%</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Chapitre 2</span>
              <span className="font-medium">{fiche.chapter_2_progress}%</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Chapitre 3</span>
              <span className="font-medium">{fiche.chapter_3_progress}%</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Chapitre 4</span>
              <span className="font-medium">{fiche.chapter_4_progress}%</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Qualité</span>
              <span className="font-medium">{fiche.quality_rating ? `${fiche.quality_rating}/5` : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Commentaires du CD */}
        {!fiche.department_head_validated && canValidate && (
          <div className="space-y-2">
            <Label htmlFor="cd-comments">Commentaires du Chef de Département</Label>
            <Textarea
              id="cd-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Ajoutez vos commentaires sur l'évolution de l'étudiant..."
              rows={4}
            />
          </div>
        )}

        {/* Commentaires existants */}
        {fiche.department_head_validated && fiche.department_head_comments && (
          <div className="p-3 bg-green-50 rounded-md border border-green-200">
            <p className="text-sm font-medium text-green-900 mb-1">Commentaires du CD :</p>
            <p className="text-sm text-green-800">{fiche.department_head_comments}</p>
            <p className="text-xs text-green-600 mt-2">
              Validé le {new Date(fiche.department_head_validation_date!).toLocaleDateString('fr-FR')}
            </p>
          </div>
        )}

        {/* Bouton de validation */}
        {!fiche.department_head_validated && (
          <div>
            {canValidate ? (
              <Button 
                onClick={handleValidate} 
                disabled={loading}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Valider l'Évolution et Autoriser la Suite
              </Button>
            ) : (
              <div className="p-3 bg-orange-50 rounded-md border border-orange-200">
                <p className="text-sm text-orange-800">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  En attente de la validation de l'encadreur
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
