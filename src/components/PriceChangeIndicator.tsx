import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceChangeIndicatorProps {
  change?: 'up' | 'down' | 'stable';
  className?: string;
}

export function PriceChangeIndicator({ change = 'stable', className }: PriceChangeIndicatorProps) {
  if (change === 'stable') {
    return (
      <Minus className={cn('w-3.5 h-3.5 text-muted-foreground', className)} />
    );
  }

  if (change === 'up') {
    return (
      <TrendingUp className={cn('w-3.5 h-3.5 text-success', className)} />
    );
  }

  return (
    <TrendingDown className={cn('w-3.5 h-3.5 text-destructive', className)} />
  );
}
