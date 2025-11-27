import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Theme, ThemeStatus } from '@/types/database';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface ThemeStatusCardProps {
  theme: Theme;
}

const statusConfig: Record<ThemeStatus, { label: string; icon: any; color: string }> = {
  pending: { label: 'En attente', icon: Clock, color: 'bg-yellow-500' },
  approved: { label: 'Approuvé', icon: CheckCircle, color: 'bg-green-500' },
  rejected: { label: 'Rejeté', icon: XCircle, color: 'bg-red-500' },
  revision_requested: { label: 'Révision demandée', icon: AlertCircle, color: 'bg-orange-500' },
};

export function ThemeStatusCard({ theme }: ThemeStatusCardProps) {
  const config = statusConfig[theme.status];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{theme.title}</CardTitle>
          <Badge className={config.color}>
            <Icon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        </div>
        <CardDescription>
          Soumis le {new Date(theme.submitted_at).toLocaleDateString('fr-FR')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium">Description:</p>
          <p className="text-sm text-gray-600">{theme.description}</p>
        </div>

        {theme.objectives && (
          <div>
            <p className="text-sm font-medium">Objectifs:</p>
            <p className="text-sm text-gray-600">{theme.objectives}</p>
          </div>
        )}

        {theme.rejection_reason && (
          <div className="bg-red-50 p-3 rounded-md">
            <p className="text-sm font-medium text-red-800">Raison du rejet:</p>
            <p className="text-sm text-red-600">{theme.rejection_reason}</p>
          </div>
        )}

        {theme.revision_notes && (
          <div className="bg-orange-50 p-3 rounded-md">
            <p className="text-sm font-medium text-orange-800">Notes de révision:</p>
            <p className="text-sm text-orange-600">{theme.revision_notes}</p>
          </div>
        )}

        {theme.supervisor && (
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm font-medium text-blue-800">Encadreur:</p>
            <p className="text-sm text-blue-600">
              {theme.supervisor.first_name} {theme.supervisor.last_name}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
