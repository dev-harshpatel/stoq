import { useState } from 'react';
import { Search, Filter, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FilterValues {
  search: string;
  brand: string;
  grade: string;
  storage: string;
  priceRange: string;
  stockStatus: string;
}

interface FilterBarProps {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onReset: () => void;
  className?: string;
}

export function FilterBar({ filters, onFiltersChange, onReset, className }: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleChange = (key: keyof FilterValues, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search ||
    filters.brand !== 'all' ||
    filters.grade !== 'all' ||
    filters.storage !== 'all' ||
    filters.priceRange !== 'all' ||
    filters.stockStatus !== 'all';

  return (
    <>
      {/* Desktop Filter Bar */}
      <div
        className={cn(
          'hidden md:flex items-center gap-4 p-4 bg-card rounded-lg shadow-soft border border-border',
          className
        )}
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search device name..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="pl-9 bg-background border-border"
          />
        </div>

        <Select value={filters.brand} onValueChange={(v) => handleChange('brand', v)}>
          <SelectTrigger className="w-36 bg-background border-border">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Brands</SelectItem>
            <SelectItem value="Apple">Apple</SelectItem>
            <SelectItem value="Google">Google</SelectItem>
            <SelectItem value="Samsung">Samsung</SelectItem>
            <SelectItem value="HMD">HMD</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.grade} onValueChange={(v) => handleChange('grade', v)}>
          <SelectTrigger className="w-32 bg-background border-border">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Grades</SelectItem>
            <SelectItem value="A">Grade A</SelectItem>
            <SelectItem value="B">Grade B</SelectItem>
            <SelectItem value="C">Grade C</SelectItem>
            <SelectItem value="D">Grade D</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.storage} onValueChange={(v) => handleChange('storage', v)}>
          <SelectTrigger className="w-36 bg-background border-border">
            <SelectValue placeholder="Storage" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Storage</SelectItem>
            <SelectItem value="32GB">32GB</SelectItem>
            <SelectItem value="64GB">64GB</SelectItem>
            <SelectItem value="128GB">128GB</SelectItem>
            <SelectItem value="256GB">256GB</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.priceRange} onValueChange={(v) => handleChange('priceRange', v)}>
          <SelectTrigger className="w-40 bg-background border-border">
            <SelectValue placeholder="Price Range" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="under200">Under $200</SelectItem>
            <SelectItem value="200-400">$200 – $400</SelectItem>
            <SelectItem value="400+">$400+</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.stockStatus} onValueChange={(v) => handleChange('stockStatus', v)}>
          <SelectTrigger className="w-40 bg-background border-border">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!hasActiveFilters}
            className="border-border"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button size="sm">Apply Filters</Button>
        </div>
      </div>

      {/* Mobile Filter Button & Modal */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search device name..."
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setMobileOpen(true)}>
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile Filter Modal */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-xl p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Filters</h3>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Brand</label>
                  <Select value={filters.brand} onValueChange={(v) => handleChange('brand', v)}>
                    <SelectTrigger className="w-full bg-background border-border">
                      <SelectValue placeholder="Brand" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Brands</SelectItem>
                      <SelectItem value="Apple">Apple</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Samsung">Samsung</SelectItem>
                      <SelectItem value="HMD">HMD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Grade</label>
                  <Select value={filters.grade} onValueChange={(v) => handleChange('grade', v)}>
                    <SelectTrigger className="w-full bg-background border-border">
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Grades</SelectItem>
                      <SelectItem value="A">Grade A</SelectItem>
                      <SelectItem value="B">Grade B</SelectItem>
                      <SelectItem value="C">Grade C</SelectItem>
                      <SelectItem value="D">Grade D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Storage</label>
                  <Select value={filters.storage} onValueChange={(v) => handleChange('storage', v)}>
                    <SelectTrigger className="w-full bg-background border-border">
                      <SelectValue placeholder="Storage" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Storage</SelectItem>
                      <SelectItem value="32GB">32GB</SelectItem>
                      <SelectItem value="64GB">64GB</SelectItem>
                      <SelectItem value="128GB">128GB</SelectItem>
                      <SelectItem value="256GB">256GB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Price Range</label>
                  <Select value={filters.priceRange} onValueChange={(v) => handleChange('priceRange', v)}>
                    <SelectTrigger className="w-full bg-background border-border">
                      <SelectValue placeholder="Price Range" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="under200">Under $200</SelectItem>
                      <SelectItem value="200-400">$200 – $400</SelectItem>
                      <SelectItem value="400+">$400+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Stock Status</label>
                  <Select value={filters.stockStatus} onValueChange={(v) => handleChange('stockStatus', v)}>
                    <SelectTrigger className="w-full bg-background border-border">
                      <SelectValue placeholder="Stock Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="low-stock">Low Stock</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={onReset}>
                  Reset
                </Button>
                <Button className="flex-1" onClick={() => setMobileOpen(false)}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
