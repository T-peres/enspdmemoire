import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Users, 
  Settings, 
  Eye, 
  Download, 
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

// Import des composants spécifiques par rôle
import { StudentDocumentInterface } from './StudentDocumentInterface';
import { SupervisorDocumentInterface } from './SupervisorDocumentInterface';
import { DepartmentHeadDocumentInterface } from './DepartmentHeadDocumentInterface';
import { JuryDocumentInterface } from './JuryDocumentInterface';
import { AdminDocumentInterface } from './AdminDocumentInterface';

interface DocumentManagementHubProps {
  themeId?: string;
  studentId?: string;
  onClose?: () => void;
}

export function DocumentManagementHub({ themeId, studentId, onClose }: DocumentManagementHubProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Éviter la superposition d'interfaces
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Fonction pour éviter la propagation des clics
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const renderRoleSpecificInterface = () => {
    if (!profile) return null;

    switch (profile.role) {
      case 'student':
        return (
          <StudentDocumentInterface 
            themeId={themeId} 
            onDocumentAction={() => setActiveTab('overview')}
          />
        );
      
      case 'supervisor':
        return (
          <SupervisorDocumentInterface 
            themeId={themeId}
            studentId={studentId}
            onDocumentAction={() => setActiveTab('overview')}
          />
        );
      
      case 'department_head':
        return (
          <DepartmentHeadDocumentInterface 
            themeId={themeId}
            studentId={studentId}
            onDocumentAction={() => setActiveTab('overview')}
          />
        );
      
      case 'jury':
        return (
          <JuryDocumentInterface 
            themeId={themeId}
            studentId={studentId}
            onDocumentAction={() => setActiveTab('overview')}
          />
        );
      
      case 'admin':
        return (
          <AdminDocumentInterface 
            themeId={themeId}
            studentId={studentId}
            onDocumentAction={() => setActiveTab('overview')}
          />
        );
      
      default:
        return (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <p className="text-muted-foreground">
                Rôle non reconnu ou accès non autorisé
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      student: 'Étudiant',
      supervisor: 'Encadreur',
      department_head: 'Chef de Département',
      jury: 'Membre du Jury',
      admin: 'Administrateur'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const getRoleIcon = (role: string) => {
    const roleIcons = {
      student: FileText,
      supervisor: Users,
      department_head: Settings,
      jury: Eye,
      admin: Settings
    };
    const Icon = roleIcons[role as keyof typeof roleIcons] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div 
      className={`fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 ${
        isFullscreen ? 'p-0' : ''
      }`}
      onClick={onClose}
    >
      <div 
        className={`bg-background rounded-lg shadow-xl max-h-[90vh] overflow-hidden ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-full max-w-6xl'
        }`}
        onClick={handleContentClick}
      >
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between bg-muted/50">
          <div className="flex items-center gap-3">
            {profile && getRoleIcon(profile.role)}
            <div>
              <h2 className="text-xl font-semibold">Gestion des Documents</h2>
              <p className="text-sm text-muted-foreground">
                Interface {profile ? getRoleDisplayName(profile.role) : 'Utilisateur'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              {profile && getRoleIcon(profile.role)}
              {profile ? getRoleDisplayName(profile.role) : 'Non connecté'}
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? 'Réduire' : 'Plein écran'}
            </Button>
            
            {onClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Fermer
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <div className="p-4 space-y-4">
              <TabsContent value="overview" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Vue d'ensemble
                    </CardTitle>
                    <CardDescription>
                      Résumé des documents et actions disponibles selon votre rôle
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderRoleSpecificInterface()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Gestion des Documents
                    </CardTitle>
                    <CardDescription>
                      Interface spécialisée pour votre rôle
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderRoleSpecificInterface()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Actions Disponibles
                    </CardTitle>
                    <CardDescription>
                      Actions spécifiques à votre rôle
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderRoleSpecificInterface()}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}