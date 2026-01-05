import { FileSpreadsheet, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExportActionsProps {
  className?: string;
}

export function ExportActions({ className }: ExportActionsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button variant="outline" size="sm" className="border-border">
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Export to Excel</span>
        <span className="sm:hidden">Excel</span>
      </Button>
      <Button variant="outline" size="sm" className="border-border">
        <FileText className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Export to PDF</span>
        <span className="sm:hidden">PDF</span>
      </Button>
      <Button variant="outline" size="sm" className="border-border">
        <Share2 className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Share Link</span>
        <span className="sm:hidden">Share</span>
      </Button>
    </div>
  );
}
