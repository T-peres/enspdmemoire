import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, LogOut, User, GraduationCap, FileText, LayoutDashboard, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const { user, profile, signOut, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <img src="/téléchargement.jpg" alt="Logo" className="h-8 w-8 object-contain" />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              PolyMémoire
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-4">
              {/* Show Topics link for students and supervisors */}
              {(hasRole('student') || hasRole('supervisor')) && (
                <Link to="/topics">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    Sujets
                  </Button>
                </Link>
              )}

              {/* Show Dashboard link based on role */}
              {hasRole('supervisor') && (
                <Link to="/supervisor-dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Tableau de Bord
                  </Button>
                </Link>
              )}

              {hasRole('department_head') && (
                <Link to="/department-dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Département
                  </Button>
                </Link>
              )}

              {hasRole('jury') && (
                <Link to="/jury-dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Jury
                  </Button>
                </Link>
              )}

              {(hasRole('admin') || hasRole('super_admin')) && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    {profile?.first_name || 'Mon Compte'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Mon Profil
                  </DropdownMenuItem>
                  
                  {hasRole('student') && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/my-thesis')}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Mon Mémoire
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/topics')}>
                        <FileText className="mr-2 h-4 w-4" />
                        Explorer les Sujets
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {hasRole('supervisor') && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/supervisor-dashboard')}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Tableau de Bord
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/my-proposed-topics')}>
                        <FileText className="mr-2 h-4 w-4" />
                        Mes Sujets Proposés
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {hasRole('department_head') && (
                    <DropdownMenuItem onClick={() => navigate('/department-dashboard')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Tableau de Bord Département
                    </DropdownMenuItem>
                  )}
                  
                  {hasRole('jury') && (
                    <DropdownMenuItem onClick={() => navigate('/jury-dashboard')}>
                      <GraduationCap className="mr-2 h-4 w-4" />
                      Tableau de Bord Jury
                    </DropdownMenuItem>
                  )}
                  
                  {(hasRole('admin') || hasRole('super_admin')) && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      Administration
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link to="/auth">
              <Button size="sm">Connexion</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
