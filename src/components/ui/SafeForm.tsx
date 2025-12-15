import React, { useCallback, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SafeFormProps {
  onSubmit: () => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Composant Form sécurisé qui empêche tout rafraîchissement de page
 * Gère automatiquement preventDefault() et stopPropagation()
 */
export function SafeForm({ 
  onSubmit, 
  children, 
  className = "", 
  disabled = false,
  loading = false 
}: SafeFormProps) {
  
  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    // CRITIQUE: Empêcher le comportement par défaut du formulaire
    event.preventDefault();
    event.stopPropagation();
    
    if (disabled || loading) {
      return;
    }

    try {
      await onSubmit();
    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire:', error);
    }
  }, [onSubmit, disabled, loading]);

  // Empêcher la soumission par Entrée dans les champs
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      // Permettre Entrée seulement dans les textarea
      if (event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
      }
    }
  }, []);

  return (
    <form 
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className={className}
      noValidate // Empêcher la validation HTML5 native
    >
      {children}
    </form>
  );
}

interface SafeSubmitButtonProps {
  onClick?: () => void | Promise<void>;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  loadingText?: string;
}

/**
 * Bouton de soumission sécurisé qui empêche les rafraîchissements
 * Utilise type="button" au lieu de "submit" pour éviter les soumissions automatiques
 */
export function SafeSubmitButton({
  onClick,
  children,
  loading = false,
  disabled = false,
  variant = "default",
  size = "default",
  className = "",
  loadingText = "Chargement..."
}: SafeSubmitButtonProps) {
  
  const handleClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    // CRITIQUE: Empêcher tout comportement par défaut
    event.preventDefault();
    event.stopPropagation();
    
    if (disabled || loading || !onClick) {
      return;
    }

    try {
      await onClick();
    } catch (error) {
      console.error('Erreur lors du clic sur le bouton:', error);
    }
  }, [onClick, disabled, loading]);

  return (
    <Button
      type="button" // IMPORTANT: Toujours "button", jamais "submit"
      onClick={handleClick}
      disabled={disabled || loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * Hook pour gérer l'état d'un formulaire de manière sécurisée
 */
export function useSafeForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [loading, setLoading] = React.useState(false);

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
    // Effacer l'erreur pour ce champ
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

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setLoading(false);
  }, [initialValues]);

  const validate = useCallback((validators: Partial<Record<keyof T, (value: any) => string | null>>) => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.entries(validators).forEach(([key, validator]) => {
      if (validator) {
        const error = validator(values[key as keyof T]);
        if (error) {
          newErrors[key as keyof T] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values]);

  return {
    values,
    errors,
    loading,
    setValue,
    setError,
    clearErrors,
    setLoading,
    reset,
    validate,
    hasErrors: Object.keys(errors).length > 0,
  };
}