import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Info, AlertCircle, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  acknowledged: boolean;
  dismissed: boolean;
  created_at: string;
}

export function AlertsPanel() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      loadAlerts();
    }
  }, [profile]);

  const loadAlerts = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', profile.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error loading alerts:', error);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
      loadAlerts();
    } catch (error: any) {
      console.error('Error acknowledging alert:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (alertId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
      loadAlerts();
    } catch (error: any) {
      console.error('Error dismissing alert:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const config = {
      error: { label: 'Urgent', variant: 'destructive' as const },
      warning: { label: 'Attention', variant: 'outline' as const },
      info: { label: 'Info', variant: 'secondary' as const },
    };

    const severityConfig = config[severity as keyof typeof config] || config.info;
    return <Badge variant={severityConfig.variant}>{severityConfig.label}</Badge>;
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Aucune alerte
          </CardTitle>
          <CardDescription>Tout est en ordre !</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertes et Notifications</CardTitle>
        <CardDescription>{alerts.length} alerte(s) active(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className={alert.acknowledged ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.severity)}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{alert.title}</h4>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(alert.created_at), 'PPp', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(alert.id)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{alert.message}</p>
                  {!alert.acknowledged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={loading}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marquer comme lu
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
