import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useDepartmentSettings, useEvaluationCriteria } from '@/hooks/useDepartmentSettings';
import { Loader2, Save, Settings, Calendar, Award, Bell, FileText } from 'lucide-react';
import { toast } from 'sonner';

export function DepartmentSettings() {
  const { settings, isLoading, updateSettings } = useDepartmentSettings();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    // Pondérations
    supervision_weight: 0.40,
    report_weight: 0.40,
    defense_weight: 0.20,
    
    // Seuils
    plagiarism_threshold: 20.00,
    min_passing_grade: 10.00,
    max_students_per_supervisor: 5,
    min_meetings_required: 3,
    min_fiche_suivi_required: 3,
    
    // Année académique
    academic_year: '2024-2025',
    
    // Dates
    theme_submission_start_date: '',
    theme_submission_end_date: '',
    theme_selection_start_date: '',
    theme_selection_end_date: '',
    report_submission_start_date: '',
    report_submission_end_date: '',
    defense_start_date: '',
    defense_end_date: '',
    
    // Soutenance
    defense_duration_minutes: 45,
    min_jury_members: 3,
    max_jury_members: 5,
    
    // Notifications
    enable_email_notifications: true,
    enable_deadline_reminders: true,
    deadline_reminder_days: 7,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        supervision_weight: settings.supervision_weight,
        report_weight: settings.report_weight,
        defense_weight: settings.defense_weight,
        plagiarism_threshold: settings.plagiarism_threshold,
        min_passing_grade: settings.min_passing_grade,
        max_students_per_supervisor: settings.max_students_per_supervisor,
        min_meetings_required: settings.min_meetings_required,
        min_fiche_suivi_required: settings.min_fiche_suivi_required,
        academic_year: settings.academic_year,
        theme_submission_start_date: settings.theme_submission_start_date || '',
        theme_submission_end_date: settings.theme_submission_end_date || '',
        theme_selection_start_date: settings.theme_selection_start_date || '',
        theme_selection_end_date: settings.theme_selection_end_date || '',
        report_submission_start_date: settings.report_submission_start_date || '',
        report_submission_end_date: settings.report_submission_end_date || '',
        defense_start_date: settings.defense_start_date || '',
        defense_end_date: settings.defense_end_date || '',
        defense_duration_minutes: settings.defense_duration_minutes,
        min_jury_members: settings.min_jury_members,
        max_jury_members: settings.max_jury_members,
        enable_email_notifications: settings.enable_email_notifications,
        enable_deadline_reminders: settings.enable_deadline_reminders,
        deadline_reminder_days: settings.deadline_reminder_days,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    // Vérifier que la somme des pondérations = 1
    const totalWeight = formData.supervision_weight + formData.report_weight + formData.defense_weight;
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      toast.error('La somme des pondérations doit être égale à 100%');
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings.mutateAsync(formData);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  const totalWeight = formData.supervision_weight + formData.report_weight + formData.defense_weight;
  const weightError = Math.abs(totalWeight - 1.0) > 0.01;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <div>
            <CardTitle>Paramètres du Département</CardTitle>
            <CardDescription>
              Configuration des règles et paramètres pour l'année {formData.academic_year}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weights" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="weights">
              <Award className="h-4 w-4 mr-2" />
              Pondérations
            </TabsTrigger>
            <TabsTrigger value="dates">
              <Calendar className="h-4 w-4 mr-2" />
              Dates Clés
            </TabsTrigger>
            <TabsTrigger value="thresholds">
              <FileText className="h-4 w-4 mr-2" />
              Seuils
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Onglet Pondérations */}
          <TabsContent value="weights" className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Total des pondérations: {(totalWeight * 100).toFixed(0)}%
                </p>
                {weightError && (
                  <p className="text-sm text-red-600">
                    ⚠️ La somme doit être égale à 100%
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Note d'Encadrement: {(formData.supervision_weight * 100).toFixed(0)}%</Label>
                <Slider
                  value={[formData.supervision_weight * 100]}
                  onValueChange={(value) => setFormData({ ...formData, supervision_weight: value[0] / 100 })}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-3">
                <Label>Note du Rapport: {(formData.report_weight * 100).toFixed(0)}%</Label>
                <Slider
                  value={[formData.report_weight * 100]}
                  onValueChange={(value) => setFormData({ ...formData, report_weight: value[0] / 100 })}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-3">
                <Label>Note de Soutenance: {(formData.defense_weight * 100).toFixed(0)}%</Label>
                <Slider
                  value={[formData.defense_weight * 100]}
                  onValueChange={(value) => setFormData({ ...formData, defense_weight: value[0] / 100 })}
                  max={100}
                  step={5}
                />
              </div>
            </div>
          </TabsContent>

          {/* Onglet Dates */}
          <TabsContent value="dates" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Soumission des Sujets</h3>
                <div>
                  <Label htmlFor="theme_submission_start">Date de début</Label>
                  <Input
                    id="theme_submission_start"
                    type="date"
                    value={formData.theme_submission_start_date}
                    onChange={(e) => setFormData({ ...formData, theme_submission_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="theme_submission_end">Date de fin</Label>
                  <Input
                    id="theme_submission_end"
                    type="date"
                    value={formData.theme_submission_end_date}
                    onChange={(e) => setFormData({ ...formData, theme_submission_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Sélection des Sujets</h3>
                <div>
                  <Label htmlFor="theme_selection_start">Date de début</Label>
                  <Input
                    id="theme_selection_start"
                    type="date"
                    value={formData.theme_selection_start_date}
                    onChange={(e) => setFormData({ ...formData, theme_selection_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="theme_selection_end">Date de fin</Label>
                  <Input
                    id="theme_selection_end"
                    type="date"
                    value={formData.theme_selection_end_date}
                    onChange={(e) => setFormData({ ...formData, theme_selection_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Dépôt des Rapports</h3>
                <div>
                  <Label htmlFor="report_submission_start">Date de début</Label>
                  <Input
                    id="report_submission_start"
                    type="date"
                    value={formData.report_submission_start_date}
                    onChange={(e) => setFormData({ ...formData, report_submission_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="report_submission_end">Date de fin</Label>
                  <Input
                    id="report_submission_end"
                    type="date"
                    value={formData.report_submission_end_date}
                    onChange={(e) => setFormData({ ...formData, report_submission_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Période de Soutenance</h3>
                <div>
                  <Label htmlFor="defense_start">Date de début</Label>
                  <Input
                    id="defense_start"
                    type="date"
                    value={formData.defense_start_date}
                    onChange={(e) => setFormData({ ...formData, defense_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="defense_end">Date de fin</Label>
                  <Input
                    id="defense_end"
                    type="date"
                    value={formData.defense_end_date}
                    onChange={(e) => setFormData({ ...formData, defense_end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Onglet Seuils */}
          <TabsContent value="thresholds" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="plagiarism_threshold">Seuil de Plagiat (%)</Label>
                <Input
                  id="plagiarism_threshold"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.plagiarism_threshold}
                  onChange={(e) => setFormData({ ...formData, plagiarism_threshold: parseFloat(e.target.value) })}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Score maximum de plagiat autorisé
                </p>
              </div>

              <div>
                <Label htmlFor="min_passing_grade">Note Minimale de Passage (/20)</Label>
                <Input
                  id="min_passing_grade"
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={formData.min_passing_grade}
                  onChange={(e) => setFormData({ ...formData, min_passing_grade: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="max_students">Nombre Max d'Étudiants par Encadreur</Label>
                <Input
                  id="max_students"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.max_students_per_supervisor}
                  onChange={(e) => setFormData({ ...formData, max_students_per_supervisor: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="min_meetings">Nombre Min de Rencontres Requises</Label>
                <Input
                  id="min_meetings"
                  type="number"
                  min="0"
                  max="20"
                  value={formData.min_meetings_required}
                  onChange={(e) => setFormData({ ...formData, min_meetings_required: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="defense_duration">Durée de Soutenance (minutes)</Label>
                <Input
                  id="defense_duration"
                  type="number"
                  min="15"
                  max="180"
                  step="5"
                  value={formData.defense_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, defense_duration_minutes: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="min_jury">Nombre Min de Membres du Jury</Label>
                <Input
                  id="min_jury"
                  type="number"
                  min="2"
                  max="10"
                  value={formData.min_jury_members}
                  onChange={(e) => setFormData({ ...formData, min_jury_members: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </TabsContent>

          {/* Onglet Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Notifications par Email</p>
                  <p className="text-sm text-gray-500">
                    Envoyer des emails pour les événements importants
                  </p>
                </div>
                <Switch
                  checked={formData.enable_email_notifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_email_notifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Rappels de Dates Limites</p>
                  <p className="text-sm text-gray-500">
                    Envoyer des rappels avant les échéances
                  </p>
                </div>
                <Switch
                  checked={formData.enable_deadline_reminders}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_deadline_reminders: checked })}
                />
              </div>

              {formData.enable_deadline_reminders && (
                <div>
                  <Label htmlFor="reminder_days">Jours avant l'échéance pour le rappel</Label>
                  <Input
                    id="reminder_days"
                    type="number"
                    min="1"
                    max="30"
                    value={formData.deadline_reminder_days}
                    onChange={(e) => setFormData({ ...formData, deadline_reminder_days: parseInt(e.target.value) })}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Bouton de sauvegarde */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || weightError} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer les Paramètres
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
