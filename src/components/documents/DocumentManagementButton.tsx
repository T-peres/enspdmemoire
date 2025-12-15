import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentInterface } from '@/hooks/useDocumentInterface';
import { 
  FileText, 
  Users, 
  Settings, 
  Eye, 
  AlertCircle,
  Lock
} from 'lucide-react';

interface DocumentManagementButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  themeId?: string;
  studentId?: string;
  showBadge?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DocumentManagementButton({
  variant = 'default',
  size = 'default',
  themeId,
  studentId,
  showBadge = true,
  disabled = false,
  className = ''
}: DocumentManagementButtonProps) {
  const { profile } = useAuth();
  const { isOpen, isActive, open, toggle } = useDocumentInterface({
    interfaceName: 'document-management',
    closeOnEscape: true,
    closeOnOutsideClick: true
  });

  if (!profile) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size={size} disabled className={className}>
              <Lock className="h-4 w-4 mr-2" />
              Documents
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Vous devez être connecté pour accéder aux documents</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const getRoleIcon = (role: string) => {
    const icons = {
      student: FileText,
      supervisor: Users,
      department_head: Settings,
      jury: Eye,
      admin: Settings
    };
    const Icon = icons[role as keyof typeof icons] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      student: 'Mes Documents',
      supervisor: 'Révision Documents',
      department_head: 'Gestion Département',
      jury: 'Évaluation Jury',
      admin: 'Administration'
    };
    return labels[role as keyof typeof labels] || 'Documents';
  };

  const handleClick = () => {
    if (disabled) return;

    const success = open({ themeId, studentId });
    
    if (!success && isOpen) {
      // Une autre interface est ouverte, afficher un message
      console.warn('Une interface de gestion des documents est déjà ouverte');
    }
  };

  const getButtonState = () => {
    if (disabled) return 'disabled';
    if (isActive) return 'active';
    if (isOpen) return 'blocked';
    return 'normal';
  };

  const buttonState = getButtonState();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Button
              variant={buttonState === 'active' ? 'default' : variant}
              size={size}
              onClick={handleClick}
              disabled={disabled || buttonState === 'blocked'}
              className={`${className} ${
                buttonState === 'active' ? 'bg-primary text-primary-foreground' : ''
              } ${
                buttonState === 'blocked' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {getRoleIcon(profile.role)}
              {size !== 'icon' && (
                <span className="ml-2">{getRoleLabel(profile.role)}</span>
              )}
              
              {buttonState === 'blocked' && (
                <AlertCircle className="h-3 w-3 ml-2 text-yellow-600" />
              )}
            </Button>

            {/* Badge de notification */}
            {showBadge && buttonState === 'normal' && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                3
              </Badge>
            )}

            {/* Indicateur d'état actif */}
            {buttonState === 'active' && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{getRoleLabel(profile.role)}</p>
            {buttonState === 'blocked' && (
              <p className="text-xs text-yellow-600 mt-1">
                Une interface est déjà ouverte
              </p>
            )}
            {buttonState === 'active' && (
              <p className="text-xs text-green-600 mt-1">
                Interface active - Cliquez pour fermer
              </p>
            )}
            {buttonState === 'normal' && (
              <p className="text-xs text-muted-foreground mt-1">
                Cliquez pour ouvrir l'interface de gestion
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}