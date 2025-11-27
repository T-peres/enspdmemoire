import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, XCircle, Loader2, FileText, User } from 'lucide-react';
import { toast } from 'sonner';

interface FicheSuivi {
  id: string;
  theme_id: string;
  student_id: string;
  supervisor_id: string;
  overall_progress: number;
  quality_rating: number | null;
  methodology_rating: number | null;
  writing_quality_rating: number | null;
  supervisor_validated: boolean;
  supervisor_validation_date: string | null;
  department_head_validated: boolean;
  department_head_validation_date: string | null;
  department_head_comments: string | null;
  student?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  supervisor?: {
    first_name: string;
    last_name: string;
  };
  theme?: {
    title: string;
  };
}

export function FicheSuiviValidation() {
  const { profile } = useAuth();
  const [fichesEnAttente, setFichesEnAttente] = useState<FicheSuivi[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  useEffect(() => {
    loadFichesEnAttente();
  }, []);

  const loadFichesEnAttente = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fiche_suivi')
        .select(`
          *,
          student:profiles!fiche_suivi_student_id_fkey(first_name, last_name, email),
          supervisor:profiles!fiche_suivi_supervisor_id_fkey(first_name, last_name),
          theme:thesis_topics(title)
        `)
        .eq('supervisor_validated', true)
        .eq('department_head_validated', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setFichesEnAttente(data || []);
    } catch (error) {
      console.error('Error loading fiches:', error);
      toast.error('Erreur lors du chargement des fiches de suivi');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (ficheId: string, approved: boolean) => {
    setValidating(ficheId);
    try {
      const { error } = await supabase
        .from('fiche_suivi')
        .update({
          department_head_validated: approved,
          department_head_validation_date: new Date().toISOString(),
          department_head_comments: comments[ficheId] || null,
          last_updated_by: profile?.id,
        })
        .eq('id', ficheId);

      if (error) throw error;

      toast.success(
        approved
          ? 'Fiche de suivi validée avec succès'
          : 'Fiche de suivi rejetée'
      );

      // Recharger la liste
      loadFichesEnAttente();
      
      // Nettoyer le commentaire
      setComments(prev => {
        const newComments = { ...prev };
        delete newComments[ficheId];
        return newComments;
      });
    } catch (error) {
      console.error('Error validating fiche:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setValidating(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fiches de Suivi en Attente</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiches de Suivi en Attente de Validation</CardTitle>
        <CardDescription>
          {fichesEnAttente.length} fiche(s) validée(s) par l'encadreur en attente de votre validation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {fichesEnAttente.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">Aucune fiche en attente</p>
            <p className="text-sm text-gray-400">
              Toutes les fiches de suivi ont été traitées
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {fichesEnAttente.map((fiche) => (
              <div key={fiche.id} className="p-6 border-2 rounded-lg bg-yellow-50 border-yellow-200">
                {/* En-tête */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold">
                        {fiche.student?.first_name} {fiche.student?.last_name}
                      </h3>
                      <Badge className="bg-yellow-500">En attente</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Email:</span> {fiche.student?.email}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Encadreur:</span>{' '}
                      {fiche.supervisor?.first_name} {fiche.supervisor?.last_name}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-yellow-600" />
                </div>

                {/* Thème */}
                {fiche.theme && (
                  <div className="mb-4 p-3 bg-white rounded border">
                    <p className="text-sm font-medium text-gray-700 mb-1">Thème du mémoire:</p>
                    <p className="text-sm">{fiche.theme.title}</p>
                  </div>
                )}

                {/* Progression */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progression globale</span>
                    <span className="text-sm font-bold text-blue-600">{fiche.overall_progress}%</span>
                  </div>
                  <Progress value={fiche.overall_progress} className="h-3" />
                </div>

                {/* Évaluations */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {fiche.quality_rating && (
                    <div className="p-3 bg-white rounded border text-center">
                      <p className="text-xs text-gray-600 mb-1">Qualité</p>
                      <p className="text-lg font-bold text-blue-600">{fiche.quality_rating}/5</p>
                    </div>
                  )}
                  {fiche.methodology_rating && (
                    <div className="p-3 bg-white rounded border text-center">
                      <p className="text-xs text-gray-600 mb-1">Méthodologie</p>
                      <p className="text-lg font-bold text-blue-600">{fiche.methodology_rating}/5</p>
                    </div>
                  )}
                  {fiche.writing_quality_rating && (
                    <div className="p-3 bg-white rounded border text-center">
                      <p className="text-xs text-gray-600 mb-1">Rédaction</p>
                      <p className="text-lg font-bold text-blue-600">{fiche.writing_quality_rating}/5</p>
                    </div>
                  )}
                </div>

                {/* Validation encadreur */}
                <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Validé par l'encadreur le{' '}
                      {fiche.supervisor_validation_date
                        ? new Date(fiche.supervisor_validation_date).toLocaleDateString('fr-FR')
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Commentaires du chef de département */}
                <div className="mb-4">
                  <Label htmlFor={`comments-${fiche.id}`}>
                    Vos commentaires (optionnel)
                  </Label>
                  <Textarea
                    id={`comments-${fiche.id}`}
                    value={comments[fiche.id] || ''}
                    onChange={(e) =>
                      setComments((prev) => ({ ...prev, [fiche.id]: e.target.value }))
                    }
                    placeholder="Ajoutez vos commentaires sur cette fiche de suivi..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleValidate(fiche.id, true)}
                    disabled={validating === fiche.id}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {validating === fiche.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validation...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Valider
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleValidate(fiche.id, false)}
                    disabled={validating === fiche.id}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
