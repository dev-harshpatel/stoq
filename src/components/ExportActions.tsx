import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { InventoryItem } from '@/data/inventory';

interface ExportActionsProps {
  data?: InventoryItem[];
  filename?: string;
  className?: string;
}

export function ExportActions({ data = [], filename = 'inventory', className }: ExportActionsProps) {
  const handleExportExcel = () => {
    if (data.length === 0) {
      toast.error('No data to export', {
        description: 'Please ensure there are items to export',
      });
      return;
    }

    try {
      exportToExcel(data, filename);
      toast.success('Export successful', {
        description: 'Your Excel file has been downloaded',
      });
    } catch (error) {
      toast.error('Export failed', {
        description: 'There was an error exporting to Excel',
      });
    }
  };

  const handleExportPDF = () => {
    if (data.length === 0) {
      toast.error('No data to export', {
        description: 'Please ensure there are items to export',
      });
      return;
    }

    try {
      exportToPDF(data, filename);
      toast.success('Export successful', {
        description: 'Your PDF file has been downloaded',
      });
    } catch (error) {
      toast.error('Export failed', {
        description: 'There was an error exporting to PDF',
      });
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button variant="outline" size="sm" className="border-border" onClick={handleExportExcel}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Export to Excel</span>
        <span className="sm:hidden">Excel</span>
      </Button>
      <Button variant="outline" size="sm" className="border-border" onClick={handleExportPDF}>
        <FileText className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Export to PDF</span>
        <span className="sm:hidden">PDF</span>
      </Button>
    </div>
  );
}
