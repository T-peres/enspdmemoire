import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function RoleBasedRedirect() {
  const { profile, roles, hasRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !profile || roles.length === 0) return;

    // Redirect based on primary role (priority order)
    if (hasRole('admin') || hasRole('super_admin')) {
      navigate('/admin', { replace: true });
    } else if (hasRole('department_head')) {
      navigate('/department-dashboard', { replace: true });
    } else if (hasRole('supervisor')) {
      navigate('/supervisor-dashboard', { replace: true });
    } else if (hasRole('jury')) {
      navigate('/jury-dashboard', { replace: true });
    } else if (hasRole('student')) {
      // Students see the default dashboard
      return;
    }
  }, [profile, roles, hasRole, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirection...</p>
        </div>
      </div>
    );
  }

  return null;
}
