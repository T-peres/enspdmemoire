/**
 * Utilitaire pour gérer le nettoyage des portals React 18
 */

export const suppressPortalErrors = () => {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Supprimer les erreurs de console
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    
    if (
      message.includes('removeChild') ||
      message.includes('not a child of this node') ||
      message.includes('NotFoundError') ||
      message.includes('Portal cleanup error')
    ) {
      return; // Supprimer complètement ces erreurs
    }
    
    originalError.apply(console, args);
  };
  
  // Supprimer aussi les warnings liés aux portals
  console.warn = (...args) => {
    const message = args[0]?.toString() || '';
    
    if (
      message.includes('Portal cleanup') ||
      message.includes('removeChild')
    ) {
      return;
    }
    
    originalWarn.apply(console, args);
  };
  
  // Gérer les erreurs globales
  const originalErrorHandler = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (
      typeof message === 'string' && (
        message.includes('removeChild') ||
        message.includes('not a child of this node')
      )
    ) {
      return true; // Empêcher la propagation
    }
    
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    return false;
  };
};

export const createSafePortal = (element: HTMLElement) => {
  const cleanup = () => {
    try {
      if (element && element.parentNode && element.parentNode.contains(element)) {
        element.parentNode.removeChild(element);
      }
    } catch (error) {
      // Ignorer silencieusement les erreurs de nettoyage
    }
  };
  
  return { cleanup };
};