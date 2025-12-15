import { DocumentManagementProvider } from '@/contexts/DocumentManagementContext';
import { DocumentManagementHub } from './DocumentManagementHub';
import { useDocumentInterface } from '@/hooks/useDocumentInterface';

interface DocumentManagementWrapperProps {
  children: React.ReactNode;
}

function DocumentManagementOverlay() {
  const { isActive, isVisible, close, themeId, studentId } = useDocumentInterface({
    interfaceName: 'document-management'
  });

  if (!isVisible) return null;

  return (
    <DocumentManagementHub
      themeId={themeId}
      studentId={studentId}
      onClose={close}
    />
  );
}

export function DocumentManagementWrapper({ children }: DocumentManagementWrapperProps) {
  return (
    <DocumentManagementProvider>
      {children}
      <DocumentManagementOverlay />
    </DocumentManagementProvider>
  );
}