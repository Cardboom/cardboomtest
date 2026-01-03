import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EnterpriseBadgeProps {
  className?: string;
  showText?: boolean;
}

export const EnterpriseBadge = ({ className, showText = true }: EnterpriseBadgeProps) => {
  return (
    <Badge 
      className={`gap-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 ${className}`}
    >
      <Building2 className="h-3 w-3" />
      {showText && 'ENTERPRISE'}
    </Badge>
  );
};
