/**
 * Utilitaires pour les composants Select
 * Garantit que toutes les valeurs sont valides et non vides
 */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Valide et nettoie les options pour un composant Select
 * Filtre les options avec des valeurs vides ou invalides
 */
export function validateSelectOptions(options: SelectOption[]): SelectOption[] {
  return options.filter(option => {
    // Vérifier que la valeur n'est pas vide, null ou undefined
    if (!option.value || option.value.trim() === '') {
      console.warn('Option avec valeur vide ignorée:', option);
      return false;
    }
    
    // Vérifier que le label existe
    if (!option.label || option.label.trim() === '') {
      console.warn('Option avec label vide ignorée:', option);
      return false;
    }
    
    return true;
  });
}

/**
 * Crée des options sécurisées à partir d'un tableau d'objets
 */
export function createSafeOptions<T>(
  items: T[],
  valueKey: keyof T,
  labelKey: keyof T,
  disabledKey?: keyof T
): SelectOption[] {
  const options = items
    .filter(item => item && item[valueKey] && item[labelKey])
    .map(item => ({
      value: String(item[valueKey]),
      label: String(item[labelKey]),
      disabled: disabledKey ? Boolean(item[disabledKey]) : false
    }));
  
  return validateSelectOptions(options);
}

/**
 * Valide une valeur de Select
 * Retourne une valeur sûre ou une chaîne vide
 */
export function validateSelectValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value).trim();
  return stringValue;
}

/**
 * Crée des options pour les énumérations
 */
export function createEnumOptions(
  enumObject: Record<string, string>,
  labels?: Record<string, string>
): SelectOption[] {
  const options = Object.entries(enumObject).map(([key, value]) => ({
    value: value,
    label: labels?.[value] || labels?.[key] || key
  }));
  
  return validateSelectOptions(options);
}

/**
 * Options prédéfinies communes
 */
export const COMMON_OPTIONS = {
  BOOLEAN: [
    { value: 'true', label: 'Oui' },
    { value: 'false', label: 'Non' }
  ],
  
  PRIORITY: [
    { value: 'low', label: 'Faible' },
    { value: 'medium', label: 'Moyenne' },
    { value: 'high', label: 'Élevée' },
    { value: 'urgent', label: 'Urgente' }
  ],
  
  STATUS: [
    { value: 'pending', label: 'En attente' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminé' },
    { value: 'cancelled', label: 'Annulé' }
  ],
  
  DOCUMENT_TYPES: [
    { value: 'plan', label: 'Plan de Mémoire' },
    { value: 'chapter_1', label: 'Chapitre 1' },
    { value: 'chapter_2', label: 'Chapitre 2' },
    { value: 'chapter_3', label: 'Chapitre 3' },
    { value: 'chapter_4', label: 'Chapitre 4' },
    { value: 'final_version', label: 'Version Finale' }
  ],
  
  JURY_DECISIONS: [
    { value: 'approved', label: '✅ Approuvé' },
    { value: 'corrections_required', label: '⚠️ Corrections Requises' },
    { value: 'rejected', label: '❌ Rejeté' }
  ]
} as const;

/**
 * Hook pour gérer les options de Select de manière sécurisée
 */
export function useSafeSelectOptions<T>(
  items: T[],
  valueKey: keyof T,
  labelKey: keyof T,
  disabledKey?: keyof T
) {
  const options = createSafeOptions(items, valueKey, labelKey, disabledKey);
  
  return {
    options,
    hasOptions: options.length > 0,
    isEmpty: options.length === 0
  };
}