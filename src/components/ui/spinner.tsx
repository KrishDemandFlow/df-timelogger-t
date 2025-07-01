import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Spinner({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Loader2
      className={cn('animate-spin text-black', className)}
      style={{ width: size, height: size }}
    />
  );
} 