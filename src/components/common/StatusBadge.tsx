import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle, FileText } from 'lucide-react';
import { ThemeStatus, DocumentStatus, PlagiarismStatus, JuryDecision, ArchiveStatus } from '@/types/database';

interface StatusBadgeProps {
  status: ThemeStatus | DocumentStatus | PlagiarismStatus | JuryDecision | ArchiveStatus | string;
  type?: 'theme' | 'document' | 'plagiarism' | 'jury' | 'archive';
  showIcon?: boolean;
}

/**
 * Badge de statut réutilisable
 * Affiche un badge coloré avec icône selon le type et le statut
 */
export function StatusBadge({ status, type = 'theme', showIcon = true }: StatusBadgeProps) {
  const getThemeConfig = (status: ThemeStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: 'En attente',
          variant: 'outline' as const,
          className: 'bg-yellow-50 text-yellow-800 border-yellow-300',
          icon: <Clock className="h-3 w-3" />,
        };
      case 'approved':
        return {
          label: 'Approuvé',
          variant: 'outline' as const,
          className: 'bg-green-50 text-green-800 border-green-300',
          icon: <CheckCircle className="h-3 w-3" />,
        };
      case 'rejected':
        return {
          label: 'Rejeté',
          variant: 'outline' as const,
          className: 'bg-red-50 text-red-800 border-red-300',
          icon: <XCircle className="h-3 w-3" />,
        };
      case 'revision_requested':
        return {
          label: 'Révision demandée',
          variant: 'outline' as const,
          className: 'bg-orange-50 text-orange-800 border-orange-300',
          icon: <AlertCircle className="h-3 w-3" />,
        };
      default:
        return {
          label: status,
          variant: 'outline' as const,
          className: 'bg-gray-50 text-gray-800 border-gray-300',
          icon: <FileText className="h-3 w-3" />,
        };
    }
  };

  const getDocumentConfig = (status: DocumentStatus) => {
    switch (status) {
      case 'submitted':
        return {
          label: 'Soumis',
          variant: 'outline' as const,
          className: 'bg-blue-50 text-blue-800 border-blue-300',
          icon: <FileText className="h-3 w-3" />,
        };
      case 'under_review':
        return {
          label: 'En révision',
          variant: 'outline' as const,
          className: 'bg-yellow-50 text-yellow-800 border-yellow-300',
          icon: <Clock className="h-3 w-3" />,
        };
      case 'approved':
        return {
          label: 'Approuvé',
          variant: 'outline' as const,
          className: 'bg-green-50 text-green-800 border-green-300',
          icon: <CheckCircle className="h-3 w-3" />,
        };
      case 'rejected':
        return {
          label: 'Rejeté',
          variant: 'outline' as const,
          className: 'bg-red-50 text-red-800 border-red-300',
          icon: <XCircle className="h-3 w-3" />,
        };
      case 'revision_requested':
        return {
          label: 'Révision demandée',
          variant: 'outline' as const,
          className: 'bg-orange-50 text-orange-800 border-orange-300',
          icon: <AlertCircle className="h-3 w-3" />,
        };
      default:
        return {
          label: status,
          variant: 'outline' as const,
          className: 'bg-gray-50 text-gray-800 border-gray-300',
          icon: <FileText className="h-3 w-3" />,
        };
    }
  };

  const getPlagiarismConfig = (status: PlagiarismStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: 'En attente',
          variant: 'outline' as const,
          className: 'bg-yellow-50 text-yellow-800 border-yellow-300',
          icon: <Clock className="h-3 w-3" />,
        };
      case 'in_progress':
        return {
          label: 'En cours',
          variant: 'outline' as const,
          className: 'bg-blue-50 text-blue-800 border-blue-300',
          icon: <Clock className="h-3 w-3" />,
        };
      case 'passed':
        return {
          label: 'Réussi',
          variant: 'outline' as const,
          className: 'bg-green-50 text-green-800 border-green-300',
          icon: <CheckCircle className="h-3 w-3" />,
        };
      case 'failed':
        return {
          label: 'Échoué',
          variant: 'outline' as const,
          className: 'bg-red-50 text-red-800 border-red-300',
          icon: <XCircle className="h-3 w-3" />,
        };
      default:
        return {
          label: status,
          variant: 'outline' as const,
          className: 'bg-gray-50 text-gray-800 border-gray-300',
          icon: <FileText className="h-3 w-3" />,
        };
    }
  };

  const getJuryConfig = (decision: JuryDecision) => {
    switch (decision) {
      case 'pending':
        return {
          label: 'En attente',
          variant: 'outline' as const,
          className: 'bg-yellow-50 text-yellow-800 border-yellow-300',
          icon: <Clock className="h-3 w-3" />,
        };
      case 'approved':
        return {
          label: 'Approuvé',
          variant: 'outline' as const,
          className: 'bg-green-50 text-green-800 border-green-300',
          icon: <CheckCircle className="h-3 w-3" />,
        };
      case 'corrections_required':
        return {
          label: 'Corrections requises',
          variant: 'outline' as const,
          className: 'bg-orange-50 text-orange-800 border-orange-300',
          icon: <AlertCircle className="h-3 w-3" />,
        };
      case 'rejected':
        return {
          label: 'Rejeté',
          variant: 'outline' as const,
          className: 'bg-red-50 text-red-800 border-red-300',
          icon: <XCircle className="h-3 w-3" />,
        };
      default:
        return {
          label: decision,
          variant: 'outline' as const,
          className: 'bg-gray-50 text-gray-800 border-gray-300',
          icon: <FileText className="h-3 w-3" />,
        };
    }
  };

  const getArchiveConfig = (status: ArchiveStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: 'En attente',
          variant: 'outline' as const,
          className: 'bg-yellow-50 text-yellow-800 border-yellow-300',
          icon: <Clock className="h-3 w-3" />,
        };
      case 'archived':
        return {
          label: 'Archivé',
          variant: 'outline' as const,
          className: 'bg-green-50 text-green-800 border-green-300',
          icon: <CheckCircle className="h-3 w-3" />,
        };
      case 'published':
        return {
          label: 'Publié',
          variant: 'outline' as const,
          className: 'bg-blue-50 text-blue-800 border-blue-300',
          icon: <CheckCircle className="h-3 w-3" />,
        };
      default:
        return {
          label: status,
          variant: 'outline' as const,
          className: 'bg-gray-50 text-gray-800 border-gray-300',
          icon: <FileText className="h-3 w-3" />,
        };
    }
  };

  let config;
  switch (type) {
    case 'theme':
      config = getThemeConfig(status as ThemeStatus);
      break;
    case 'document':
      config = getDocumentConfig(status as DocumentStatus);
      break;
    case 'plagiarism':
      config = getPlagiarismConfig(status as PlagiarismStatus);
      break;
    case 'jury':
      config = getJuryConfig(status as JuryDecision);
      break;
    case 'archive':
      config = getArchiveConfig(status as ArchiveStatus);
      break;
    default:
      config = {
        label: status,
        variant: 'outline' as const,
        className: 'bg-gray-50 text-gray-800 border-gray-300',
        icon: <FileText className="h-3 w-3" />,
      };
  }

  return (
    <Badge variant={config.variant} className={`${config.className} ${showIcon ? 'gap-1' : ''}`}>
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}
