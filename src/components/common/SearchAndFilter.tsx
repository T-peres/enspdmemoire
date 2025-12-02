import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface FilterOption {
  id: string;
  label: string;
  value: string;
}

interface SearchAndFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filters: Record<string, any>) => void;
  filterOptions?: {
    status?: FilterOption[];
    type?: FilterOption[];
    dateRange?: boolean;
  };
  placeholder?: string;
}

/**
 * Composant de recherche et filtrage
 * Barre de recherche avec filtres avancés réutilisable
 */
export function SearchAndFilter({
  onSearch,
  onFilter,
  filterOptions,
  placeholder = 'Rechercher...',
}: SearchAndFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeFilters, setActiveFilters] = useState(0);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleApplyFilters = () => {
    const filters: Record<string, any> = {};

    if (selectedStatus.length > 0) {
      filters.status = selectedStatus;
    }

    if (selectedType.length > 0) {
      filters.type = selectedType;
    }

    if (dateFrom) {
      filters.dateFrom = dateFrom;
    }

    if (dateTo) {
      filters.dateTo = dateTo;
    }

    setActiveFilters(Object.keys(filters).length);
    onFilter(filters);
  };

  const handleClearFilters = () => {
    setSelectedStatus([]);
    setSelectedType([]);
    setDateFrom('');
    setDateTo('');
    setActiveFilters(0);
    onFilter({});
  };

  const toggleStatus = (value: string) => {
    setSelectedStatus(prev =>
      prev.includes(value)
        ? prev.filter(s => s !== value)
        : [...prev, value]
    );
  };

  const toggleType = (value: string) => {
    setSelectedType(prev =>
      prev.includes(value)
        ? prev.filter(t => t !== value)
        : [...prev, value]
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {/* Barre de recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="search-filter"
            name="search"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-10"
            autoComplete="off"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearch('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Bouton de filtres */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
              {activeFilters > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filtres</h4>
                {activeFilters > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8 text-xs"
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>

              {/* Filtre par statut */}
              {filterOptions?.status && filterOptions.status.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Statut</Label>
                  <div className="space-y-2">
                    {filterOptions.status.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${option.id}`}
                          checked={selectedStatus.includes(option.value)}
                          onCheckedChange={() => toggleStatus(option.value)}
                        />
                        <Label
                          htmlFor={`status-${option.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtre par type */}
              {filterOptions?.type && filterOptions.type.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Type</Label>
                  <div className="space-y-2">
                    {filterOptions.type.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${option.id}`}
                          checked={selectedType.includes(option.value)}
                          onCheckedChange={() => toggleType(option.value)}
                        />
                        <Label
                          htmlFor={`type-${option.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtre par date */}
              {filterOptions?.dateRange && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Période</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="date-from" className="text-xs">Du</Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date-to" className="text-xs">Au</Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleApplyFilters} className="w-full">
                Appliquer les filtres
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Affichage des filtres actifs */}
      {activeFilters > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedStatus.map((status) => {
            const option = filterOptions?.status?.find(o => o.value === status);
            return (
              <Badge key={status} variant="secondary" className="gap-1">
                {option?.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleStatus(status)}
                />
              </Badge>
            );
          })}
          {selectedType.map((type) => {
            const option = filterOptions?.type?.find(o => o.value === type);
            return (
              <Badge key={type} variant="secondary" className="gap-1">
                {option?.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleType(type)}
                />
              </Badge>
            );
          })}
          {(dateFrom || dateTo) && (
            <Badge variant="secondary" className="gap-1">
              {dateFrom && dateTo
                ? `${dateFrom} - ${dateTo}`
                : dateFrom
                ? `À partir du ${dateFrom}`
                : `Jusqu'au ${dateTo}`}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
