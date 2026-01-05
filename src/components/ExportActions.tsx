import { FileSpreadsheet, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExportActionsProps {
  className?: string;
}

export function ExportActions({ className }: ExportActionsProps) {
  const handleExportExcel = () => {
    toast.success('Exporting to Excel...', {
      description: 'Your download will start shortly',
    });
  };

  const handleExportPDF = () => {
    toast.success('Exporting to PDF...', {
      description: 'Your download will start shortly',
    });
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!', {
      description: 'Share this read-only link with your team',
    });
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
      <Button variant="outline" size="sm" className="border-border" onClick={handleShareLink}>
        <Share2 className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Share Link</span>
        <span className="sm:hidden">Share</span>
      </Button>
    </div>
  );
}
