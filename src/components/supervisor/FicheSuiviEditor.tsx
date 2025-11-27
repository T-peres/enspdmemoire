import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useFicheSuivi } from '@/hooks/useFicheSuivi';
import { Loader2, Save, CheckCircle } from 'lucide-react';

interface FicheSuiviEditorProps {
  themeId: string;
  studentId: string;
  supervisorId: string;
}

export function FicheSuiviEditor({ themeId, studentId, supervisorId }: FicheSuiviEditorProps) {
  const { ficheSuivi, updateFicheSuivi, validateBySupervisor } = useFicheSuivi(themeId);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const [formData, setFormData] = useState({
    plan_submitted: false,
    plan_approved: false,
    plan_comments: '',
    chapter_1_progress: 0,
    chapter_1_comments: '',
    chapter_2_progress: 0,
    chapter_2_comments: '',
    chapter_3_progress: 0,
    chapter_3_comments: '',
    chapter_4_progress: 0,
    chapter_4_comments: '',
    overall_progress: 0,
    quality_rating: 3,
    methodology_rating: 3,
    writing_quality_rating: 3,
  });

  useEffect(() => {
    if (ficheSuivi) {
      setFormData({
        plan_submitted: ficheSuivi.plan_submitted,
        plan_approved: ficheSuivi.plan_approved,
        plan_comments: ficheSuivi.plan_comments || '',
        chapter_1_progress: ficheSuivi.chapter_1_progress,
        chapter_1_comments: ficheSuivi.chapter_1_comments || '',
        chapter_2_progress: ficheSuivi.chapter_2_progress,
        chapter_2_comments: ficheSuivi.chapter_2_comments || '',
        chapter_3_progress: ficheSuivi.chapter_3_progress,
        chapter_3_comments: ficheSuivi.chapter_3_comments || '',
        chapter_4_progress: ficheSuivi.chapter_4_progress,
        chapter_4_comments: ficheSuivi.chapter_4_comments || '',
        overall_progress: ficheSuivi.overall_progress,
        quality_rating: ficheSuivi.quality_rating || 3,
        methodology_rating: ficheSuivi.methodology_rating || 3,
        writing_quality_rating: ficheSuivi.writing_quality_rating || 3,
      });
    }
  }, [ficheSuivi]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateFicheSuivi.mutateAsync({
        theme_id: themeId,
        student_id: studentId,
        supervisor_id: supervisorId,
        ...formData,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await validateBySupervisor.mutateAsync(themeId);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiche de suivi</CardTitle>
        <CardDescription>
          Suivez l'évolution du travail de l'étudiant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan */}
        <div className="space-y-3 border-b pb-4">
          <h3 className="font-semibold">Plan du mémoire</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.plan_submitted}
                onChange={(e) => setFormData({ ...formData, plan_submitted: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Soumis</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.plan_approved}
                onChange={(e) => setFormData({ ...formData, plan_approved: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Approuvé</span>
            </label>
          </div>
          <Textarea
            value={formData.plan_comments}
            onChange={(e) => setFormData({ ...formData, plan_comments: e.target.value })}
            placeholder="Commentaires sur le plan..."
            rows={2}
          />
        </div>

        {/* Chapitres */}
        {[1, 2, 3, 4].map((chapter) => (
          <div key={chapter} className="space-y-3 border-b pb-4">
            <h3 className="font-semibold">Chapitre {chapter}</h3>
            <div>
              <Label>Progression: {formData[`chapter_${chapter}_progress` as keyof typeof formData]}%</Label>
              <Slider
                value={[formData[`chapter_${chapter}_progress` as keyof typeof formData] as number]}
                onValueChange={(value) => setFormData({ ...formData, [`chapter_${chapter}_progress`]: value[0] })}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>
            <Textarea
              value={formData[`chapter_${chapter}_comments` as keyof typeof formData] as string}
              onChange={(e) => setFormData({ ...formData, [`chapter_${chapter}_comments`]: e.target.value })}
              placeholder={`Commentaires sur le chapitre ${chapter}...`}
              rows={2}
            />
          </div>
        ))}

        {/* Évaluation globale */}
        <div className="space-y-3 border-b pb-4">
          <h3 className="font-semibold">Évaluation globale</h3>
          <div>
            <Label>Progression globale: {formData.overall_progress}%</Label>
            <Slider
              value={[formData.overall_progress]}
              onValueChange={(value) => setFormData({ ...formData, overall_progress: value[0] })}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Qualité: {formData.quality_rating}/5</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={formData.quality_rating}
                onChange={(e) => setFormData({ ...formData, quality_rating: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Méthodologie: {formData.methodology_rating}/5</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={formData.methodology_rating}
                onChange={(e) => setFormData({ ...formData, methodology_rating: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Rédaction: {formData.writing_quality_rating}/5</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={formData.writing_quality_rating}
                onChange={(e) => setFormData({ ...formData, writing_quality_rating: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Enregistrer
          </Button>

          {!ficheSuivi?.supervisor_validated && (
            <Button
              onClick={handleValidate}
              disabled={isValidating}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isValidating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Valider
            </Button>
          )}
        </div>

        {ficheSuivi?.supervisor_validated && (
          <div className="bg-green-50 p-3 rounded-md text-center">
            <p className="text-sm text-green-800 font-medium">
              ✓ Validé par l'encadreur le {new Date(ficheSuivi.supervisor_validation_date!).toLocaleDateString('fr-FR')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
