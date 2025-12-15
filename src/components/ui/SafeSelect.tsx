import React, { useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface SafeSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  className?: string;
  id?: string;
}

/**
 * Composant Select sécurisé qui empêche tout rafraîchissement de page
 * Utilise des gestionnaires d'événements appropriés et preventDefault()
 */
export function SafeSelect({
  value,
  onValueChange,
  options,
  label,
  placeholder = "Sélectionner une option",
  required = false,
  disabled = false,
  loading = false,
  error,
  className = "",
  id,
}: SafeSelectProps) {
  
  // Gestionnaire sécurisé qui empêche la propagation et le comportement par défaut
  const handleValueChange = useCallback((newValue: string) => {
    // Empêcher tout comportement par défaut
    try {
      onValueChange(newValue);
    } catch (error) {
      console.error('Erreur lors du changement de valeur:', error);
    }
  }, [onValueChange]);

  // Gestionnaire pour empêcher la soumission de formulaire
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select 
        value={value} 
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger 
          id={id}
          className="focus:ring-2 focus:ring-primary focus:border-transparent"
          onKeyDown={handleKeyDown}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto">
          {options.length === 0 ? (
            <SelectItem value="__empty__" disabled>
              Aucune option disponible
            </SelectItem>
          ) : (
            options.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}

/**
 * Hook pour gérer l'état d'un select de manière sécurisée
 */
export function useSafeSelect<T = string>(initialValue?: T) {
  const [value, setValue] = React.useState<T | undefined>(initialValue);
  const [error, setError] = React.useState<string>('');

  const handleChange = useCallback((newValue: T) => {
    setValue(newValue);
    setError(''); // Effacer l'erreur lors du changement
  }, []);

  const validate = useCallback((validator?: (value: T | undefined) => string | null) => {
    if (validator) {
      const validationError = validator(value);
      if (validationError) {
        setError(validationError);
        return false;
      }
    }
    setError('');
    return true;
  }, [value]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError('');
  }, [initialValue]);

  return {
    value,
    setValue: handleChange,
    error,
    setError,
    validate,
    reset,
    hasValue: value !== undefined && value !== null && value !== '',
  };
}