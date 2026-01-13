import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GradeBadgeProps {
  gradingCompany?: string | null;
  grade?: string | null;
  certificationStatus?: string | null;
  className?: string;
  showUngraded?: boolean;
}

/**
 * Universal grade badge component for consistent grade display across the app.
 * Handles CardBoom grades, external grades (PSA, BGS, etc.), pending states, and ungraded items.
 */
export function GradeBadge({ 
  gradingCompany, 
  grade, 
  certificationStatus,
  className,
  showUngraded = true 
}: GradeBadgeProps) {
  // CardBoom grading - pending state
  if (
    gradingCompany === 'CardBoom' && 
    (grade === 'Pending' || certificationStatus === 'pending' || certificationStatus === 'queued' || certificationStatus === 'processing' || certificationStatus === 'in_review')
  ) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "bg-background/80 backdrop-blur-sm text-amber-500 border-amber-500/30 gap-1",
          className
        )}
      >
        <Award className="w-3 h-3" />
        Grading...
      </Badge>
    );
  }

  // CardBoom grading - completed with score
  if (gradingCompany === 'CardBoom' && grade && grade !== 'Pending') {
    return (
      <Badge 
        className={cn(
          "bg-primary text-primary-foreground gap-1",
          className
        )}
      >
        <Award className="w-3 h-3" />
        CB {grade}
      </Badge>
    );
  }

  // External grading company (PSA, BGS, CGC, etc.)
  if (gradingCompany && grade) {
    return (
      <Badge 
        variant="secondary" 
        className={cn(
          "bg-background/80 backdrop-blur-sm gap-1",
          className
        )}
      >
        <Award className="w-3 h-3" />
        {gradingCompany} {grade}
      </Badge>
    );
  }

  // Certification pending without grading company
  if (certificationStatus === 'pending') {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-amber-500 border-amber-500/30",
          className
        )}
      >
        Grading...
      </Badge>
    );
  }

  // Ungraded
  if (showUngraded) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "bg-background/80 backdrop-blur-sm text-xs text-muted-foreground",
          className
        )}
      >
        Ungraded
      </Badge>
    );
  }

  return null;
}
