import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Star, Save } from 'lucide-react';

interface IntermediateEvaluationFormProps {
  themeId: string;
  studentId: string;
  onSuccess?: () => void;
}

export function IntermediateEvaluationForm({
  themeId,
  studentId,
  onSuccess,
}: IntermediateEvaluationFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    evaluation_type: 'monthly',
    content_quality: 3,
    methodology_quality: 3,
    writing_quality: 3,
    research_depth: 3,
    autonomy_level: 3,
    respect_deadlines: 3,
    strengths: '',
    weaknesses: '',
    recommendations: '',
    visible_to_student: false,
  });

  const calculateOverallScore = () => {
    const {
      content_quality,
      methodology_quality,
      writing_quality,
      research_depth,
      autonomy_level,
      respect_deadlines,
    } = formData;

    const average =
      (content_quality +
        methodology_quality +
        writing_quality +
        research_depth +
        autonomy_level +
        respect_deadlines) /
      6;

    return ((average / 5) * 20).toFixed(2);
  };

  const handleSubmit = async () => {
    if (!profile) return;

    if (!formData.strengths || !formData.weaknesses || !formData.recommendations) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('intermediate_evaluations').insert({
        theme_id: themeId,
        student_id: studentId,
        supervisor_id: profile.id,
        ...formData,
        overall_score: parseFloat(calculateOverallScore()),
        shared_at: formData.visible_to_student ? new Date().toISOString() : null,
      });

      if (error) throw error;

      if (formData.visible_to_student) {
        await supabase.rpc('create_notification', {
          p_user_id: studentId,
          p_title: 'Nouvelle Évaluation Intermédiaire',
          p_message: `Votre encadreur a publié une évaluation intermédiaire. Note: ${calculateOverallScore()}/20`,
          p_type: 'info',
          p_entity_type: 'evaluation',
        });
      }

      toast.success('Évaluation enregistrée avec succès');

      // Reset form
      setFormData({
        evaluation_type: 'monthly',
        content_quality: 3,
        methodology_quality: 3,
        writing_quality: 3,
        research_depth: 3,
        autonomy_level: 3,
        respect_deadlines: 3,
        strengths: '',
        weaknesses: '',
        recommendations: '',
        visible_to_student: false,
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating evaluation:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const RatingSlider = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium">{value}/5</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={1}
        max={5}
        step={1}
        className="w-full"
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Évaluation Intermédiaire</CardTitle>
        <CardDescription>
          Évaluez le travail de l'étudiant selon différents critères
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="evaluation_type">Type d'évaluation</Label>
          <Select
            value={formData.evaluation_type}
            onValueChange={(value) => setFormData({ ...formData, evaluation_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensuelle</SelectItem>
              <SelectItem value="chapter">Par chapitre</SelectItem>
              <SelectItem value="milestone">Jalon important</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Critères d'évaluation</h3>

          <RatingSlider
            label="Qualité du contenu"
            value={formData.content_quality}
            onChange={(value) => setFormData({ ...formData, content_quality: value })}
          />

          <RatingSlider
            label="Qualité de la méthodologie"
            value={formData.methodology_quality}
            onChange={(value) => setFormData({ ...formData, methodology_quality: value })}
          />

          <RatingSlider
            label="Qualité de la rédaction"
            value={formData.writing_quality}
            onChange={(value) => setFormData({ ...formData, writing_quality: value })}
          />

          <RatingSlider
            label="Profondeur de la recherche"
            value={formData.research_depth}
            onChange={(value) => setFormData({ ...formData, research_depth: value })}
          />

          <RatingSlider
            label="Niveau d'autonomie"
            value={formData.autonomy_level}
            onChange={(value) => setFormData({ ...formData, autonomy_level: value })}
          />

          <RatingSlider
            label="Respect des délais"
            value={formData.respect_deadlines}
            onChange={(value) => setFormData({ ...formData, respect_deadlines: value })}
          />
        </div>

        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Note globale estimée</span>
            <span className="text-2xl font-bold text-primary">{calculateOverallScore()}/20</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="strengths">Points forts *</Label>
          <Textarea
            id="strengths"
            value={formData.strengths}
            onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
            placeholder="Quels sont les points forts du travail de l'étudiant ?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weaknesses">Points à améliorer *</Label>
          <Textarea
            id="weaknesses"
            value={formData.weaknesses}
            onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
            placeholder="Quels aspects nécessitent des améliorations ?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recommendations">Recommandations *</Label>
          <Textarea
            id="recommendations"
            value={formData.recommendations}
            onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
            placeholder="Quelles sont vos recommandations pour la suite ?"
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="visible">Partager avec l'étudiant</Label>
            <p className="text-sm text-muted-foreground">
              L'étudiant pourra consulter cette évaluation
            </p>
          </div>
          <Switch
            id="visible"
            checked={formData.visible_to_student}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, visible_to_student: checked })
            }
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Enregistrer l'évaluation
        </Button>
      </CardContent>
    </Card>
  );
}
