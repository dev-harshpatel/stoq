import { cn } from '@/lib/utils';

interface GradeBadgeProps {
  grade: 'A' | 'B' | 'C';
  className?: string;
}

const gradeStyles = {
  A: 'bg-primary/10 text-primary border-primary/20',
  B: 'bg-muted text-muted-foreground border-border',
  C: 'bg-muted text-muted-foreground border-border',
};

export function GradeBadge({ grade, className }: GradeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold border',
        gradeStyles[grade],
        className
      )}
    >
      {grade}
    </span>
  );
}
