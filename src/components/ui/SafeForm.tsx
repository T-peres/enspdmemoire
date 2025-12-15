import React, { FormEvent, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SafeFormProps {
  children: React.ReactNode;
  onSubmit?: () => void | Promise<void>;
  className?: string;
  id?: string;
}

interface SafeSubmitButtonProps {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  type?: 'button'; // Toujours button pour éviter les soumissions
}

/**
 * Composant Form sécurisé qui empêche tout rafraîchissement de page
 * Utilise preventDefault() automatiquement et gère les soumissions async
 */
export function SafeForm({ children, onSubmit, className = '', id }: SafeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    // TOUJOURS empêcher le comportement par défaut
    event.preventDefault();
    event.stopPropagation();

    if (!onSubmit || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit();
    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, isSubmitting]);

  // Gestionnaire pour empêcher les soumissions par Enter
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      // Permettre Enter seulement dans les textarea
      if (event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }, []);

  return (
    <form 
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className={className}
      id={id}
      noValidate // Désactiver la validation HTML native
    >
      {children}
    </form>
  );
}

/**
 * Bouton de soumission sécurisé qui empêche les rafraîchissements
 * Toujours de type "button" et gère les états de chargement
 */
export function SafeSubmitButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'default',
  size = 'default',
  className = '',
}: SafeSubmitButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async (event: React.MouseEvent) => {
    // TOUJOURS empêcher le comportement par défaut
    event.preventDefault();
    event.stopPropagation();

    if (!onClick || disabled || loading || isLoading) return;

    try {
      setIsLoading(true);
      await onClick();
    } catch (error) {
      console.error('Erreur lors du clic sur le bouton:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onClick, disabled, loading, isLoading]);

  const isButtonDisabled = disabled || loading || isLoading;
  const showLoader = loading || isLoading;

  return (
    <Button
      type="button" // TOUJOURS button, jamais submit
      variant={variant}
      size={size}
      className={className}
      disabled={isButtonDisabled}
      onClick={handleClick}
    >
      {showLoader && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

/**
 * Hook pour gérer l'état d'un formulaire de manière sécurisée
 */
export function useSafeForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [loading, setLoading] = useState(false);

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
    // Effacer l'erreur quand la valeur change
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  }, [errors]);

  const setError = useCallback(<K extends keyof T>(key: K, error: string) => {
    setErrors(prev => ({ ...prev, [key]: error }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const validate = useCallback((
    validators: Partial<Record<keyof T, (value: T[keyof T]) => string | null>>
  ): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let hasErrors = false;

    Object.entries(validators).forEach(([key, validator]) => {
      if (validator) {
        const error = validator(values[key as keyof T]);
        if (error) {
          newErrors[key as keyof T] = error;
          hasErrors = true;
        }
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  }, [values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setLoading(false);
  }, [initialValues]);

  const submitSafely = useCallback(async (
    submitFn: (values: T) => void | Promise<void>
  ) => {
    if (loading) return;

    try {
      setLoading(true);
      await submitFn(values);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [values, loading]);

  return {
    values,
    errors,
    loading,
    setValue,
    setError,
    clearErrors,
    validate,
    reset,
    submitSafely,
    hasErrors: Object.values(errors).some(error => !!error),
    hasValues: Object.values(values).some(value => 
      value !== '' && value !== null && value !== undefined
    ),
  };
}

/**
 * Composant wrapper pour les champs de formulaire avec gestion d'erreur
 */
interface SafeFieldProps {
  children: React.ReactNode;
  error?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export function SafeField({ 
  children, 
  error, 
  label, 
  required = false, 
  className = '' 
}: SafeFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

/**
 * Exemple d'utilisation complète
 */
export function SafeFormExample() {
  const form = useSafeForm({
    name: '',
    email: '',
    department: '',
  });

  const handleSubmit = async () => {
    // Validation
    const isValid = form.validate({
      name: (value) => !value ? 'Le nom est requis' : null,
      email: (value) => !value ? 'L\'email est requis' : null,
      department: (value) => !value ? 'Le département est requis' : null,
    });

    if (!isValid) return;

    // Soumission sécurisée
    await form.submitSafely(async (values) => {
      // Simulation d'une API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Données soumises:', values);
    });
  };

  return (
    <SafeForm onSubmit={handleSubmit} className="space-y-4">
      <SafeField 
        label="Nom" 
        required 
        error={form.errors.name}
      >
        <input
          type="text"
          value={form.values.name}
          onChange={(e) => form.setValue('name', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </SafeField>

      <SafeField 
        label="Email" 
        required 
        error={form.errors.email}
      >
        <input
          type="email"
          value={form.values.email}
          onChange={(e) => form.setValue('email', e.target.value)}
          className="w-full p-2 border rounded"
        />
      </SafeField>

      <SafeField 
        label="Département" 
        required 
        error={form.errors.department}
      >
        {/* Utilisation avec SafeSelect */}
        {/* <SafeSelect
          value={form.values.department}
          onValueChange={(value) => form.setValue('department', value)}
          options={departmentOptions}
        /> */}
      </SafeField>

      <div className="flex gap-2">
        <SafeSubmitButton 
          onClick={handleSubmit}
          loading={form.loading}
          disabled={form.hasErrors}
        >
          Soumettre
        </SafeSubmitButton>
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={form.reset}
        >
          Réinitialiser
        </Button>
      </div>
    </SafeForm>
  );
}