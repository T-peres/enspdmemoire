import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDepartments } from '@/hooks/useDepartments';
import { Skeleton } from '@/components/ui/skeleton';

interface DepartmentSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function DepartmentSelector({
  value,
  onValueChange,
  label = 'Département',
  placeholder = 'Sélectionner un département',
  required = false,
}: DepartmentSelectorProps) {
  const { data: departments, isLoading } = useDepartments();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {departments?.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              <div className="flex flex-col">
                <span className="font-medium">{dept.code}</span>
                <span className="text-xs text-muted-foreground">{dept.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
