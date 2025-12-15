// Composants principaux
export { DocumentManagementHub } from './DocumentManagementHub';
export { DocumentManagementWrapper } from './DocumentManagementWrapper';
export { DocumentManagementButton } from './DocumentManagementButton';

// Interfaces spécialisées par rôle
export { StudentDocumentInterface } from './StudentDocumentInterface';
export { SupervisorDocumentInterface } from './SupervisorDocumentInterface';
export { DepartmentHeadDocumentInterface } from './DepartmentHeadDocumentInterface';
export { JuryDocumentInterface } from './JuryDocumentInterface';
export { AdminDocumentInterface } from './AdminDocumentInterface';

// Context et hooks
export { DocumentManagementProvider, useDocumentManagement } from '@/contexts/DocumentManagementContext';
export { useDocumentInterface } from '@/hooks/useDocumentInterface';