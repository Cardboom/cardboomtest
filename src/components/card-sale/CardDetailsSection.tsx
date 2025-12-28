import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Gamepad2, Layers, Hash, Globe, Sparkles, FileText
} from 'lucide-react';

interface CardMetadata {
  game?: string;
  setName?: string;
  rarity?: string;
  cardNumber?: string;
  language?: string;
  printType?: string;
  condition?: string;
  description?: string;
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
