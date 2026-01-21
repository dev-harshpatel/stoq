'use client'

import { useState, useMemo } from 'react';
import { useInventory } from '@/contexts/InventoryContext';
import { InventoryItem } from '@/data/inventory';
import { FilterBar, FilterValues } from '@/components/FilterBar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RotateCcw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const defaultFilters: FilterValues = {
  search: '',
  brand: 'all',
  grade: 'all',
  storage: 'all',
  priceRange: 'all',
  stockStatus: 'all',
};

export default function ProductManagement() {
  const { inventory, updateProduct, resetInventory, isLoading } = useInventory();
  const [editedProducts, setEditedProducts] = useState<Record<string, Partial<InventoryItem>>>({});
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);

  const handleFieldChange = (id: string, field: keyof InventoryItem, value: string | number) => {
    setEditedProducts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSave = (id: string) => {
    const updates = editedProducts[id];
    if (updates) {
      updateProduct(id, updates);
      setEditedProducts((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      toast.success('Product updated', {
        description: 'Changes have been saved to inventory.',
      });
    }
  };

  const handleReset = () => {
    resetInventory();
    setEditedProducts({});
    toast.success('Inventory reset', {
      description: 'All products have been reset to original values.',
    });
  };

  const getFieldValue = (product: InventoryItem, field: keyof InventoryItem) => {
    if (editedProducts[product.id]?.[field] !== undefined) {
      return editedProducts[product.id][field];
    }
    return product[field];
  };

  const filteredItems = useMemo(() => {
    return inventory.filter((item: InventoryItem) => {
      if (
        filters.search &&
        !item.deviceName.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (filters.brand !== 'all' && item.brand !== filters.brand) {
        return false;
      }
      if (filters.grade !== 'all' && item.grade !== filters.grade) {
        return false;
      }
      if (filters.storage !== 'all' && item.storage !== filters.storage) {
        return false;
      }
      if (filters.priceRange !== 'all') {
        switch (filters.priceRange) {
          case 'under200':
            if (item.pricePerUnit >= 200) return false;
            break;
          case '200-400':
            if (item.pricePerUnit < 200 || item.pricePerUnit > 400) return false;
            break;
          case '400+':
            if (item.pricePerUnit < 400) return false;
            break;
        }
      }
      return true;
    });
  }, [inventory, filters]);

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  const hasChanges = Object.keys(editedProducts).length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 border-b border-border mb-4 -mx-4 lg:-mx-6 px-4 lg:px-6 pt-4 lg:pt-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Edit Products</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Make changes to product details. Changes are local and will reset on page refresh.
            </p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset All
              </Button>
            )}
          </div>
        </div>

        {/* Info Alert */}
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> All changes are saved to inventory and will persist across page refreshes.
            Use "Reset All" to restore original values from JSON file.
          </p>
        </div>

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onReset={handleResetFilters}
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 lg:-mx-6 px-4 lg:px-6">

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            Loading inventory...
          </div>
        )}

        {/* Products Table */}
        {!isLoading && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Device Name
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Brand
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Grade
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Storage
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Quantity
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-4">
                    Price/Unit
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((product, index) => {
                  const hasEdits = !!editedProducts[product.id];
                  const deviceName = getFieldValue(product, 'deviceName') as string;
                  const brand = getFieldValue(product, 'brand') as string;
                  const grade = getFieldValue(product, 'grade') as 'A' | 'B' | 'C';
                  const storage = getFieldValue(product, 'storage') as string;
                  const quantity = getFieldValue(product, 'quantity') as number;
                  const pricePerUnit = getFieldValue(product, 'pricePerUnit') as number;

                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        'transition-colors hover:bg-muted/50',
                        index % 2 === 1 && 'bg-muted/20',
                        hasEdits && 'bg-primary/5'
                      )}
                    >
                      <td className="px-6 py-4">
                        <Input
                          value={deviceName}
                          onChange={(e) => handleFieldChange(product.id, 'deviceName', e.target.value)}
                          className="min-w-[200px]"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Input
                          value={brand}
                          onChange={(e) => handleFieldChange(product.id, 'brand', e.target.value)}
                          className="min-w-[120px]"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Select
                          value={grade}
                          onValueChange={(value) => handleFieldChange(product.id, 'grade', value as 'A' | 'B' | 'C')}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-4">
                        <Input
                          value={storage}
                          onChange={(e) => handleFieldChange(product.id, 'storage', e.target.value)}
                          className="min-w-[100px]"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) => handleFieldChange(product.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-24 text-center"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={pricePerUnit}
                            onChange={(e) => handleFieldChange(product.id, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                            className="w-28 text-right"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {hasEdits && (
                            <Button
                              size="sm"
                              onClick={() => handleSave(product.id)}
                              className="gap-2"
                            >
                              <Save className="h-3 w-3" />
                              Save
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {!isLoading && filteredItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No products found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}

