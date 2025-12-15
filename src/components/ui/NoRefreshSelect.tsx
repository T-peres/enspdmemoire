import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface NoRefreshSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Select 100% sécurisé - Ne peut JAMAIS causer de rafraîchissement
 */
export function NoRefreshSelect({
  value,
  onValueChange,
  options,
  placeholder = "Sélectionner...",
  className = "",
  disabled = false
}: NoRefreshSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Gestionnaire ultra-sécurisé pour le clic
  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    setIsOpen(prev => !prev);
  }, [disabled]);

  // Gestionnaire ultra-sécurisé pour la sélection
  const handleOptionSelect = useCallback((optionValue: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      onValueChange(optionValue);
      setIsOpen(false);
    } catch (error) {
      console.error('Erreur lors de la sélection:', error);
    }
  }, [onValueChange]);

  // Trouver l'option sélectionnée
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div 
      ref={containerRef}
      className={cn("relative", className)}
    >
      {/* Trigger - 100% sécurisé */}
      <div
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
          "cursor-pointer select-none hover:bg-accent",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        onClick={handleTriggerClick}
      >
        <span className={cn(
          "truncate",
          !selectedOption && "text-muted-foreground"
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 opacity-50 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </div>

      {/* Dropdown - 100% sécurisé */}
      {isOpen && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
          <div className="max-h-60 overflow-auto p-1">
            {options.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100",
                  option.value === value && "bg-blue-50 text-blue-900"
                )}
                onClick={(e) => handleOptionSelect(option.value, e)}
              >
                <Check 
                  className={cn(
                    "mr-2 h-4 w-4",
                    option.value === value ? "opacity-100" : "opacity-0"
                  )} 
                />
                <span className="truncate">{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}