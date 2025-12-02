import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FormFieldProps extends React.ComponentProps<"input"> {
  label: string;
  id: string;
  name?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerClassName?: string;
}

interface TextareaFieldProps extends React.ComponentProps<"textarea"> {
  label: string;
  id: string;
  name?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerClassName?: string;
}

/**
 * Composant FormField - Input avec Label et gestion d'erreurs
 * Garantit l'accessibilité avec id, name, et aria-attributes
 */
export function FormField({
  label,
  id,
  name,
  error,
  helperText,
  required,
  containerClassName,
  className,
  ...props
}: FormFieldProps) {
  const inputName = name || id;
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ");

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={id}
        name={inputName}
        className={cn(error && "border-destructive", className)}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy || undefined}
        required={required}
        {...props}
      />
      {helperText && !error && (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Composant TextareaField - Textarea avec Label et gestion d'erreurs
 * Garantit l'accessibilité avec id, name, et aria-attributes
 */
export function TextareaField({
  label,
  id,
  name,
  error,
  helperText,
  required,
  containerClassName,
  className,
  ...props
}: TextareaFieldProps) {
  const inputName = name || id;
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ");

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        id={id}
        name={inputName}
        className={cn(error && "border-destructive", className)}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy || undefined}
        required={required}
        {...props}
      />
      {helperText && !error && (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
