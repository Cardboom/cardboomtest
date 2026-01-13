import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Gamepad2, Layers, Hash, Globe, Sparkles, FileText, Award, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardMetadata {
  game?: string;
  setName?: string;
  rarity?: string;
  cardNumber?: string;
  language?: string;
  printType?: string;
  condition?: string;
  description?: string;
  cbgiScore?: number;
  cbgiGradeLabel?: string;
  psaGrade?: string;
  gradingCompany?: string;
}

export const CardDetailsSection = ({ metadata }: { metadata: CardMetadata }) => {
  const details = [
    { icon: Gamepad2, label: 'Game', value: metadata.game },
    { icon: Layers, label: 'Set', value: metadata.setName },
    { icon: Sparkles, label: 'Rarity', value: metadata.rarity },
    { icon: Hash, label: 'Card Number', value: metadata.cardNumber },
    { icon: Globe, label: 'Language', value: metadata.language || 'English' },
    { icon: FileText, label: 'Print Type', value: metadata.printType },
  ].filter(d => d.value);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Card Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Grading Section - CBGI and PSA/BGS/CGC */}
        {(metadata.cbgiScore || metadata.psaGrade) && (
          <>
            <div className="space-y-2">
              {metadata.cbgiScore && metadata.cbgiScore > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Award className="w-4 h-4 text-primary" />
                    CBGI Grading
                  </span>
                  <Badge className="bg-primary/20 text-primary border-primary/30 font-bold">
                    {metadata.cbgiScore.toFixed(1)} {metadata.cbgiGradeLabel && `• ${metadata.cbgiGradeLabel}`}
                  </Badge>
                </div>
              )}
              {metadata.gradingCompany && metadata.psaGrade && (
                <div className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 text-blue-500" />
                    {metadata.gradingCompany} Grading
                  </span>
                  <Badge className={cn(
                    "font-bold",
                    metadata.psaGrade === '10' || metadata.psaGrade === '9.5'
                      ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-600 border-amber-500/30"
                      : "bg-blue-500/20 text-blue-600 border-blue-500/30"
                  )}>
                    {metadata.psaGrade}
                  </Badge>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}
        
        {details.map((detail, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <detail.icon className="w-4 h-4" />
              {detail.label}
            </span>
            <Badge variant="secondary" className="capitalize">{detail.value}</Badge>
          </div>
        ))}
        {metadata.description && (
          <>
            <Separator />
            <p className="text-sm text-muted-foreground leading-relaxed">{metadata.description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
