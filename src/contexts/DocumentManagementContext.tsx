import React, { createContext, useContext, useState, useCallback } from 'react';

interface DocumentManagementState {
  isOpen: boolean;
  activeInterface: string | null;
  themeId?: string;
  studentId?: string;
  preventOverlap: boolean;
}

interface DocumentManagementContextType {
  state: DocumentManagementState;
  openDocumentManagement: (options?: {
    interface?: string;
    themeId?: string;
    studentId?: string;
  }) => void;
  closeDocumentManagement: () => void;
  setActiveInterface: (interfaceName: string) => void;
  preventOverlap: (prevent: boolean) => void;
}

const DocumentManagementContext = createContext<DocumentManagementContextType | undefined>(undefined);

export function DocumentManagementProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DocumentManagementState>({
    isOpen: false,
    activeInterface: null,
    preventOverlap: true
  });

  const openDocumentManagement = useCallback((options?: {
    interface?: string;
    themeId?: string;
    studentId?: string;
  }) => {
    // Éviter l'ouverture multiple si preventOverlap est activé
    if (state.preventOverlap && state.isOpen) {
      console.warn('Document management interface is already open');
      return;
    }

    setState(prev => ({
      ...prev,
      isOpen: true,
      activeInterface: options?.interface || null,
      themeId: options?.themeId,
      studentId: options?.studentId
    }));
  }, [state.preventOverlap, state.isOpen]);

  const closeDocumentManagement = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      activeInterface: null,
      themeId: undefined,
      studentId: undefined
    }));
  }, []);

  const setActiveInterface = useCallback((interfaceName: string) => {
    setState(prev => ({
      ...prev,
      activeInterface: interfaceName
    }));
  }, []);

  const preventOverlap = useCallback((prevent: boolean) => {
    setState(prev => ({
      ...prev,
      preventOverlap: prevent
    }));
  }, []);

  const value: DocumentManagementContextType = {
    state,
    openDocumentManagement,
    closeDocumentManagement,
    setActiveInterface,
    preventOverlap
  };

  return (
    <DocumentManagementContext.Provider value={value}>
      {children}
    </DocumentManagementContext.Provider>
  );
}

export function useDocumentManagement() {
  const context = useContext(DocumentManagementContext);
  if (context === undefined) {
    throw new Error('useDocumentManagement must be used within a DocumentManagementProvider');
  }
  return context;
}