import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMeetingReports } from '@/hooks/useMeetingReports';
import { Loader2, Save, Send, FileText, Calendar, Target, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface MeetingReportFormCompleteProps {
  meetingId?: string;
  themeId: string;
  studentId: string;
  supervisorId: string;
  onSuccess?: () => void;
}

export function MeetingReportFormComplete({
  meetingId,
  themeId,
  studentId,
  supervisorId,
  onSuccess,
}: MeetingReportFormCompleteProps) {
  const { createReport, updateReport, submitReport } = useMeetingReports(themeId, studentId);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    meeting_date: new Date().toISOString().split('T')[0],
    objectives_set: '',
    work_accomplished: '',
    problems_encountered: '',
    solutions_proposed: '',
    recommendations: '',
    next_steps: '',
    next_meeting_date: '',
    progress_rating: 3,
    engagement_rating: 3,
    quality_rating: 3,
    chapters_progress: [
      { chapter: 1, progress: 0, comments: '' },
      { chapter: 2, progress: 0, comments: '' },
      { chapter: 3, progress: 0, comments: '' },
      { chapter: 4, progress: 0, comments: '' },
    ],
  });

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const reportData = {
        meeting_id: meetingId,
        theme_id: themeId,
        student_id: studentId,
        supervisor_id: supervisorId,
        meeting_date: new Date(formData.meeting_date).toISOString(),
        objectives_set: formData.objectives_set,
        work_accomplished: formData.work_accomplished,
        problems_encountered: formData.problems_encountered,
        solutions_proposed: formData.solutions_proposed,
        recommendations: formData.recommendations,
        next_steps: formData.next_steps,
        next_meeting_date: formData.next_meeting_date ? new Date(formData.next_meeting_date).toISOString() : null,
        progress_rating: formData.progress_rating,
        engagement_rating: formData.engagement_rating,
        quality_rating: formData.quality_rating,
        chapters_progress: formData.chapters_progress,
        status: 'draft',
      };

      if (reportId) {
        await updateReport.mutateAsync({ id: reportId, updates: reportData });
      } else {
        const result = await createReport.mutateAsync(reportData);
        setReportId(result.id);
      }

      if (onSuccess) onSuccess();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.objectives_set.trim()) {
      toast.error('Les objectifs fixés sont obligatoires');
      return;
    }
    if (!formData.work_accomplished.trim()) {
      toast.error('Le travail accompli est obligatoire');
      return;
    }
    if (!formData.recommendations.trim()) {
      toast.error('Les recommandations sont obligatoires');
      return;
    }
    if (!formData.next_steps.trim()) {
      toast.error('Les prochaines étapes sont obligatoires');
      return;
    }

    setIsSubmitting(true);
    try {
      // Sauvegarder d'abord si ce n'est pas déjà fait
      if (!reportId) {
        await handleSaveDraft();
      }

      // Soumettre au chef de département
      if (reportId) {
        await submitReport.mutateAsync(reportId);
        if (onSuccess) onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateChapterProgress = (chapterIndex: number, field: string, value: any) => {
    const newChapters = [...formData.chapters_progress];
    newChapters[chapterIndex] = { ...newChapters[chapterIndex], [field]: value };
    setFormData({ ...formData, chapters_progress: newChapters });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <div>
            <CardTitle>Fiche de Rencontre Détaillée</CardTitle>
            <CardDescription>
              Remplir la fiche de suivi pour cette rencontre avec l'étudiant
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date de la rencontre */}
        <div className="space-y-2">
          <Label htmlFor="meeting_date" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date de la Rencontre *
          </Label>
          <Input
            id="meeting_date"
            type="date"
            value={formData.meeting_date}
            onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
            required
          />
        </div>

        {/* Objectifs fixés */}
        <div className="space-y-2">
          <Label htmlFor="objectives" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Objectifs Fixés pour cette Rencontre *
          </Label>
          <Textarea
            id="objectives"
            value={formData.objectives_set}
            onChange={(e) => setFormData({ ...formData, objectives_set: e.target.value })}
            placeholder="Quels étaient les objectifs à atteindre lors de cette rencontre ?"
            rows={3}
            required
          />
        </div>

        {/* Travail accompli */}
        <div className="space-y-2">
          <Label htmlFor="work_accomplished" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Travail Accompli depuis la Dernière Rencontre *
          </Label>
          <Textarea
            id="work_accomplished"
            value={formData.work_accomplished}
            onChange={(e) => setFormData({ ...formData, work_accomplished: e.target.value })}
            placeholder="Décrivez le travail réalisé par l'étudiant..."
            rows={4}
            required
          />
        </div>

        {/* Progression par chapitre */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Évolution du Rapport par Chapitre</h3>
          {formData.chapters_progress.map((chapter, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Chapitre {chapter.chapter}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={chapter.progress}
                    onChange={(e) => updateChapterProgress(index, 'progress', parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>
              <Textarea
                value={chapter.comments}
                onChange={(e) => updateChapterProgress(index, 'comments', e.target.value)}
                placeholder={`Commentaires sur le chapitre ${chapter.chapter}...`}
                rows={2}
              />
            </div>
          ))}
        </div>

        {/* Problèmes rencontrés */}
        <div className="space-y-2">
          <Label htmlFor="problems">Problèmes Rencontrés</Label>
          <Textarea
            id="problems"
            value={formData.problems_encountered}
            onChange={(e) => setFormData({ ...formData, problems_encountered: e.target.value })}
            placeholder="Quels problèmes ou difficultés l'étudiant a-t-il rencontrés ?"
            rows={3}
          />
        </div>

        {/* Solutions proposées */}
        <div className="space-y-2">
          <Label htmlFor="solutions">Solutions Proposées</Label>
          <Textarea
            id="solutions"
            value={formData.solutions_proposed}
            onChange={(e) => setFormData({ ...formData, solutions_proposed: e.target.value })}
            placeholder="Quelles solutions avez-vous proposées ?"
            rows={3}
          />
        </div>

        {/* Recommandations */}
        <div className="space-y-2">
          <Label htmlFor="recommendations">Recommandations de l'Encadreur *</Label>
          <Textarea
            id="recommendations"
            value={formData.recommendations}
            onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
            placeholder="Vos recommandations pour améliorer le travail..."
            rows={4}
            required
          />
        </div>

        {/* Prochaines étapes */}
        <div className="space-y-2">
          <Label htmlFor="next_steps">Prochaines Étapes à Réaliser *</Label>
          <Textarea
            id="next_steps"
            value={formData.next_steps}
            onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
            placeholder="Que doit faire l'étudiant d'ici la prochaine rencontre ?"
            rows={3}
            required
          />
        </div>

        {/* Date de la prochaine rencontre */}
        <div className="space-y-2">
          <Label htmlFor="next_meeting">Date de la Prochaine Rencontre</Label>
          <Input
            id="next_meeting"
            type="date"
            value={formData.next_meeting_date}
            onChange={(e) => setFormData({ ...formData, next_meeting_date: e.target.value })}
          />
        </div>

        {/* Évaluations */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Évaluation de la Rencontre</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="progress_rating">Progression (1-5)</Label>
              <Select
                value={formData.progress_rating.toString()}
                onValueChange={(value) => setFormData({ ...formData, progress_rating: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <SelectItem key={rating} value={rating.toString()}>
                      {rating} - {rating === 1 ? 'Très faible' : rating === 2 ? 'Faible' : rating === 3 ? 'Moyen' : rating === 4 ? 'Bon' : 'Excellent'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="engagement_rating">Engagement (1-5)</Label>
              <Select
                value={formData.engagement_rating.toString()}
                onValueChange={(value) => setFormData({ ...formData, engagement_rating: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <SelectItem key={rating} value={rating.toString()}>
                      {rating} - {rating === 1 ? 'Très faible' : rating === 2 ? 'Faible' : rating === 3 ? 'Moyen' : rating === 4 ? 'Bon' : 'Excellent'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quality_rating">Qualité du Travail (1-5)</Label>
              <Select
                value={formData.quality_rating.toString()}
                onValueChange={(value) => setFormData({ ...formData, quality_rating: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <SelectItem key={rating} value={rating.toString()}>
                      {rating} - {rating === 1 ? 'Très faible' : rating === 2 ? 'Faible' : rating === 3 ? 'Moyen' : rating === 4 ? 'Bon' : 'Excellent'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={handleSaveDraft} disabled={isSaving || isSubmitting} variant="outline" className="flex-1">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer Brouillon
              </>
            )}
          </Button>

          <Button onClick={handleSubmit} disabled={isSaving || isSubmitting} className="flex-1 bg-green-600 hover:bg-green-700">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Soumission...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Soumettre au Chef de Département
              </>
            )}
          </Button>
        </div>

        <p className="text-sm text-gray-500 text-center">
          * Champs obligatoires pour la soumission
        </p>
      </CardContent>
    </Card>
  );
}
