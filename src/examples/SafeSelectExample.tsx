import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SafeForm, SafeSubmitButton, useSafeForm } from '@/components/ui/SafeForm';
import { SafeSelect, useSafeSelect } from '@/components/ui/SafeSelect';
import { DepartmentSelector } from '@/components/department/DepartmentSelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * Exemple complet d'utilisation des composants sécurisés
 * Démontre comment éviter les rafraîchissements de page
 */
export function SafeSelectExample() {
  // Utilisation du hook de formulaire sécurisé
  const form = useSafeForm({
    name: '',
    email: '',
    department: '',
    role: '',
    priority: '',
  });

  // Utilisation des hooks de select sécurisés
  const departmentSelect = useSafeSelect<string>('');
  const roleSelect = useSafeSelect<string>('');
  const prioritySelect = useSafeSelect<string>('');

  // Options pour les selects
  const roleOptions = [
    { value: 'student', label: 'Étudiant' },
    { value: 'supervisor', label: 'Encadreur' },
    { value: 'jury', label: 'Membre du Jury' },
    { value: 'department_head', label: 'Chef de Département' },
    { value: 'admin', label: 'Administrateur' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Basse' },
    { value: 'medium', label: 'Moyenne' },
    { value: 'high', label: 'Haute' },
    { value: 'urgent', label: 'Urgente' },
  ];

  // Gestionnaire de soumission sécurisé
  const handleSubmit = async () => {
    // Validation
    const isValid = form.validate({
      name: (value) => !value.trim() ? 'Le nom est requis' : null,
      email: (value) => {
        if (!value.trim()) return 'L\'email est requis';
        if (!/\S+@\S+\.\S+/.test(value)) return 'Email invalide';
        return null;
      },
    });

    const isDepartmentValid = departmentSelect.validate(
      (value) => !value ? 'Le département est requis' : null
    );

    const isRoleValid = roleSelect.validate(
      (value) => !value ? 'Le rôle est requis' : null
    );

    if (!isValid || !isDepartmentValid || !isRoleValid) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    form.setLoading(true);

    try {
      // Simulation d'un appel API
      await new Promise(resolve => setTimeout(resolve, 2000));

      const formData = {
        ...form.values,
        department: departmentSelect.value,
        role: roleSelect.value,
        priority: prioritySelect.value,
      };

      console.log('Données du formulaire:', formData);
      toast.success('Formulaire soumis avec succès !');

      // Réinitialiser le formulaire
      form.reset();
      departmentSelect.reset();
      roleSelect.reset();
      prioritySelect.reset();

    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      form.setLoading(false);
    }
  };

  // Gestionnaire de réinitialisation
  const handleReset = () => {
    form.reset();
    departmentSelect.reset();
    roleSelect.reset();
    prioritySelect.reset();
    toast.info('Formulaire réinitialisé');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exemple de Formulaire Sécurisé</CardTitle>
          <CardDescription>
            Démonstration des composants SafeSelect et SafeForm qui empêchent 
            tout rafraîchissement de page lors des interactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SafeForm onSubmit={handleSubmit} className="space-y-6">
            {/* Champs de texte classiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  value={form.values.name}
                  onChange={(e) => form.setValue('name', e.target.value)}
                  placeholder="Votre nom complet"
                />
                {form.errors.name && (
                  <p className="text-sm text-destructive mt-1">{form.errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.values.email}
                  onChange={(e) => form.setValue('email', e.target.value)}
                  placeholder="votre.email@example.com"
                />
                {form.errors.email && (
                  <p className="text-sm text-destructive mt-1">{form.errors.email}</p>
                )}
              </div>
            </div>

            {/* DepartmentSelector existant (déjà sécurisé) */}
            <DepartmentSelector
              value={departmentSelect.value}
              onValueChange={departmentSelect.setValue}
              label="Département"
              required
              showStats
            />
            {departmentSelect.error && (
              <p className="text-sm text-destructive mt-1">{departmentSelect.error}</p>
            )}

            {/* SafeSelect pour les rôles */}
            <SafeSelect
              value={roleSelect.value}
              onValueChange={roleSelect.setValue}
              options={roleOptions}
              label="Rôle"
              placeholder="Sélectionner un rôle"
              required
              error={roleSelect.error}
            />

            {/* SafeSelect pour la priorité (optionnel) */}
            <SafeSelect
              value={prioritySelect.value}
              onValueChange={prioritySelect.setValue}
              options={priorityOptions}
              label="Priorité"
              placeholder="Sélectionner une priorité (optionnel)"
              error={prioritySelect.error}
            />

            {/* Informations de débogage */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">État du formulaire (Debug)</h4>
              <div className="text-sm space-y-1">
                <p><strong>Nom:</strong> {form.values.name || '(vide)'}</p>
                <p><strong>Email:</strong> {form.values.email || '(vide)'}</p>
                <p><strong>Département:</strong> {departmentSelect.value || '(non sélectionné)'}</p>
                <p><strong>Rôle:</strong> {roleSelect.value || '(non sélectionné)'}</p>
                <p><strong>Priorité:</strong> {prioritySelect.value || '(non sélectionnée)'}</p>
                <p><strong>Erreurs:</strong> {form.hasErrors ? 'Oui' : 'Non'}</p>
                <p><strong>Chargement:</strong> {form.loading ? 'Oui' : 'Non'}</p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-4">
              <SafeSubmitButton
                onClick={handleSubmit}
                loading={form.loading}
                disabled={!form.values.name || !form.values.email || !departmentSelect.hasValue || !roleSelect.hasValue}
                className="flex-1"
                loadingText="Soumission en cours..."
              >
                Soumettre le formulaire
              </SafeSubmitButton>

              <SafeSubmitButton
                onClick={handleReset}
                variant="outline"
                disabled={form.loading}
              >
                Réinitialiser
              </SafeSubmitButton>
            </div>
          </SafeForm>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions de Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>✅ <strong>Testez les interactions suivantes :</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Sélectionnez différentes options dans les listes déroulantes</li>
            <li>Appuyez sur Entrée dans les champs de texte</li>
            <li>Cliquez sur les boutons de soumission</li>
            <li>Utilisez la navigation au clavier (Tab, flèches)</li>
          </ul>
          <p className="mt-4">
            <strong>Résultat attendu :</strong> Aucun rafraîchissement de page, 
            l'état du formulaire est conservé, les interactions sont fluides.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}