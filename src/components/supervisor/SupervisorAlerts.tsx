import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, FileText, MessageSquare } from 'lucide-react';

interface Alert {
  id: string;
  type: 'missing_meeting' | 'pending_form' | 'document_ready' | 'message';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  studentName: string;
}

interface SupervisorAlertsProps {
  alerts: Alert[];
}

export function SupervisorAlerts({ alerts }: SupervisorAlertsProps) {
  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'missing_meeting': return <Clock className="h-4 w-4" />;
      case 'pending_form': return <FileText className="h-4 w-4" />;
      case 'document_ready': return <FileText className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Alert['priority']) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Alertes ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
              {getIcon(alert.type)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{alert.title}</span>
                  <Badge variant={getPriorityColor(alert.priority)} size="sm">
                    {alert.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
                <p className="text-xs text-muted-foreground mt-1">Étudiant: {alert.studentName}</p>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Aucune alerte</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}