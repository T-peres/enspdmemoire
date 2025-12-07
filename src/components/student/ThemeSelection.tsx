import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, User, CheckCircle, Clock, XCircle } from 'lucide-react';
import { ThemeSubmissionForm } from './ThemeSubmissionForm';
import { toast } from 'sonner';

export function ThemeSelection() {
  const { profile } = useAuth();
  const [theme, setTheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchTheme();
    }
  }, [profile]);

  const fetchTheme = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('themes')
        .select(`
          *,
          supervisor:profiles!themes_supervisor_id_fkey(first_name, last_name, email),
          department:departments(name, code)
        `)
        .eq('student_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTheme(data);
    } catch (error: any) {
      console.error('Error fetching theme:', error);
      toast.error('Erreur lors du chargement du sujet');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'outline', icon: Clock, label: 'En attente' },
      approved: { variant: 'default', icon: CheckCircle, label: 'Approuvé' },
      rejected: { variant: 'destructive', icon: XCircle, label: 'Rejeté' },
    };

    const { variant, icon: Icon, label } = config[status] || config.pending;

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (!theme) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Sujet de Mémoire
          </CardTitle>
          <CardDescription>
            Vous n'avez pas encore de sujet de mémoire
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showSubmissionForm ? (
            <ThemeSubmissionForm onSuccess={() => {
              setShowSubmissionForm(false);
              fetchTheme();
            }} />
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Commencez par soumettre un sujet de mémoire
              </p>
              <Button onClick={() => setShowSubmissionForm(true)}>
                Proposer un Sujet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              {theme.title}
            </CardTitle>
            <CardDescription className="mt-2">
              {theme.description}
            </CardDescription>
          </div>
          {getStatusBadge(theme.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">Encadreur</p>
              <p className="text-sm text-gray-600">
                {theme.supervisor
                  ? `${theme.supervisor.first_name} ${theme.supervisor.last_name}`
                  : 'Non assigné'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Département</p>
            <p className="text-sm text-gray-600">
              {theme.department?.name} ({theme.department?.code})
            </p>
          </div>
        </div>

        {theme.keywords && theme.keywords.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Mots-clés</p>
            <div className="flex flex-wrap gap-2">
              {theme.keywords.map((keyword: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {theme.status === 'rejected' && theme.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-900 mb-1">Raison du rejet</p>
            <p className="text-sm text-red-700">{theme.rejection_reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
