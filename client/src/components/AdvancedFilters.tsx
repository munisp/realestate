import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Search, X, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface FilterValues {
  search?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  showDateRange?: boolean;
  showStatus?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
}

export function AdvancedFilters({
  onFilterChange,
  statusOptions = [],
  showDateRange = true,
  showStatus = true,
  showSearch = true,
  searchPlaceholder = 'Search...',
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({});
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof FilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

  const presets = [
    { label: 'Today', getValue: () => ({ dateFrom: new Date(), dateTo: new Date() }) },
    { 
      label: 'This Week', 
      getValue: () => {
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        return { dateFrom: weekStart, dateTo: new Date() };
      }
    },
    { 
      label: 'This Month', 
      getValue: () => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { dateFrom: monthStart, dateTo: new Date() };
      }
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {showSearch && (
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        {showStatus && statusOptions.length > 0 && (
          <Select value={filters.status || ''} onValueChange={(value) => updateFilter('status', value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showDateRange && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('justify-start text-left font-normal', !filters.dateFrom && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? (
                  filters.dateTo ? (
                    <>
                      {format(filters.dateFrom, 'LLL dd, y')} - {format(filters.dateTo, 'LLL dd, y')}
                    </>
                  ) : (
                    format(filters.dateFrom, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 border-b">
                <div className="flex gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const values = preset.getValue();
                        setFilters({ ...filters, ...values });
                        onFilterChange({ ...filters, ...values });
                        setIsOpen(false);
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="p-3">
                <Label className="text-sm font-medium mb-2 block">From Date</Label>
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => updateFilter('dateFrom', date)}
                  initialFocus
                />
                <Label className="text-sm font-medium mb-2 mt-4 block">To Date</Label>
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) => updateFilter('dateTo', date)}
                  disabled={(date) => filters.dateFrom ? date < filters.dateFrom : false}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}

        {activeFilterCount > 0 && (
          <Button variant="ghost" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('search', '')}
              />
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusOptions.find(o => o.value === filters.status)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('status', '')}
              />
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              From: {format(filters.dateFrom, 'MMM dd, yyyy')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('dateFrom', undefined)}
              />
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1">
              To: {format(filters.dateTo, 'MMM dd, yyyy')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilter('dateTo', undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
