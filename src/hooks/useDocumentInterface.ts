import { useState, useEffect, useCallback } from 'react';
import { useDocumentManagement } from '@/contexts/DocumentManagementContext';

interface UseDocumentInterfaceOptions {
  interfaceName: string;
  autoClose?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
}

export function useDocumentInterface({
  interfaceName,
  autoClose = false,
  closeOnEscape = true,
  closeOnOutsideClick = true
}: UseDocumentInterfaceOptions) {
  const { state, openDocumentManagement, closeDocumentManagement, setActiveInterface } = useDocumentManagement();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Vérifier si cette interface est active
  const isActive = state.isOpen && state.activeInterface === interfaceName;

  // Ouvrir l'interface
  const open = useCallback((options?: {
    themeId?: string;
    studentId?: string;
  }) => {
    if (state.preventOverlap && state.isOpen && !isActive) {
      console.warn(`Cannot open ${interfaceName}: another interface is already open`);
      return false;
    }

    openDocumentManagement({
      interface: interfaceName,
      ...options
    });
    return true;
  }, [interfaceName, openDocumentManagement, state.preventOverlap, state.isOpen, isActive]);

  // Fermer l'interface
  const close = useCallback(() => {
    if (autoClose) {
      setIsAnimating(true);
      setTimeout(() => {
        closeDocumentManagement();
        setIsAnimating(false);
      }, 200); // Animation de fermeture
    } else {
      closeDocumentManagement();
    }
  }, [closeDocumentManagement, autoClose]);

  // Basculer l'interface
  const toggle = useCallback((options?: {
    themeId?: string;
    studentId?: string;
  }) => {
    if (isActive) {
      close();
    } else {
      open(options);
    }
  }, [isActive, open, close]);

  // Gérer les événements clavier
  useEffect(() => {
    if (!closeOnEscape || !isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, isActive, close]);

  // Gérer les clics à l'extérieur
  useEffect(() => {
    if (!closeOnOutsideClick || !isActive) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const modalContent = document.querySelector('[data-document-interface="true"]');
      
      if (modalContent && !modalContent.contains(target)) {
        close();
      }
    };

    // Délai pour éviter la fermeture immédiate lors de l'ouverture
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeOnOutsideClick, isActive, close]);

  // Mettre à jour la visibilité avec animation
  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
    } else {
      const timeoutId = setTimeout(() => {
        setIsVisible(false);
      }, 200); // Délai pour l'animation de fermeture
      
      return () => clearTimeout(timeoutId);
    }
  }, [isActive]);

  // Prévenir le scroll du body quand l'interface est ouverte
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isActive]);

  return {
    isOpen: state.isOpen,
    isActive,
    isVisible,
    isAnimating,
    themeId: state.themeId,
    studentId: state.studentId,
    open,
    close,
    toggle,
    setActiveInterface: () => setActiveInterface(interfaceName)
  };
}