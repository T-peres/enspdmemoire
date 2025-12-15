import { useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDepartments } from '@/hooks/useDepartments';
import { AppRole } from '@/types/database';
import { Building2, Users, GraduationCap } from 'lucide-react';

interface DepartmentSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  userRole?: AppRole;
  showStats?: boolean;
  disabled?: boolean;
}

export function DepartmentSelector({
  value,
  onValueChange,
  label = 'Département',
  placeholder = 'Sélectionner un département',
  required = false,
  userRole,
  showStats = false,
  disabled = false,
}: DepartmentSelectorProps) {
  const { data: departments, isLoading } = useDepartments();

  // Gestionnaire sécurisé pour empêcher tout rafraîchissement
  const handleValueChange = useCallback((newValue: string) => {
    try {
      // Empêcher tout comportement par défaut potentiel
      onValueChange(newValue);
    } catch (error) {
      console.error('Erreur lors du changement de département:', error);
    }
  }, [onValueChange]);

  // Gestionnaire pour empêcher la soumission par Entrée
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const getDepartmentColor = (code: string) => {
    const colors: Record<string, string> = {
      'GIT': 'bg-blue-100 text-blue-800 border-blue-300',
      'GESI': 'bg-purple-100 text-purple-800 border-purple-300',
      'GQHSE': 'bg-green-100 text-green-800 border-green-300',
      'GAM': 'bg-orange-100 text-orange-800 border-orange-300',
      'GMP': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'GP': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'GE': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'GM': 'bg-red-100 text-red-800 border-red-300',
      'GPH': 'bg-pink-100 text-pink-800 border-pink-300',
      'GC': 'bg-teal-100 text-teal-800 border-teal-300',
    };
    return colors[code] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getFilteredDepartments = () => {
    if (!departments) return [];
    
    // Filtrer selon le rôle si nécessaire
    if (userRole === 'department_head') {
      // Un chef de département ne voit que son département
      // Cette logique peut être adaptée selon vos besoins
      return departments;
    }
    return departments;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {label && (
          <Label className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {label}
          </Label>
        )}
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select 
        value={value} 
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger 
          className="h-auto min-h-[40px] focus:ring-2 focus:ring-primary focus:border-transparent"
          onKeyDown={handleKeyDown}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {getFilteredDepartments().map((dept) => (
            <SelectItem key={dept.id} value={dept.id} className="p-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={`${getDepartmentColor(dept.code)} font-medium`}
                  >
                    {dept.code}
                  </Badge>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm">{dept.name}</span>
                    {dept.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {dept.description}
                      </span>
                    )}
                  </div>
                </div>
                {showStats && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>0</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      <span>0</span>
                    </div>
                  </div>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && departments && (
        <div className="text-sm text-muted-foreground">
          Département sélectionné: {departments.find(d => d.id === value)?.name}
        </div>
      )}
    </div>
  );
}
