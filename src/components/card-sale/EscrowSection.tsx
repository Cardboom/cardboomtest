import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, CreditCard, Package, Search, Check, 
  DollarSign, ArrowRight, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EscrowSectionProps {
  gradingAvailable?: boolean;
  gradingPrice?: number;
  gradingDays?: string;
  onRequestGrading?: () => void;
}

export const EscrowSection = ({
  gradingAvailable = true,
  gradingPrice = 20,
  gradingDays = '3-5',
  onRequestGrading,
}: EscrowSectionProps) => {
  const steps = [
    {
      icon: CreditCard,
      title: 'Buyer Pays',
      description: 'Payment held in secure escrow',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Package,
      title: 'Seller Ships',
      description: 'Card shipped with tracking',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Search,
      title: 'Card Verified',
      description: 'Optional authentication check',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Check,
      title: 'Buyer Receives',
      description: 'Confirm receipt of card',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: DollarSign,
      title: 'Funds Released',
      description: 'Seller gets paid securely',
      color: 'text-gain',
      bgColor: 'bg-gain/10',
    },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-gain" />
          Escrow Protection
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Escrow Flow Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary via-primary to-gain hidden sm:block" />
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className={cn(
                  "relative z-10 flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0",
                  step.bgColor
                )}>
                  <step.icon className={cn("w-5 h-5", step.color)} />
                </div>
                <div className="flex-1 pt-2">
                  <h4 className="font-medium text-foreground text-sm">{step.title}</h4>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground mt-3 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badge */}
        <div className="p-4 rounded-xl bg-gain/10 border border-gain/20 text-center">
          <Shield className="w-8 h-8 text-gain mx-auto mb-2" />
          <p className="font-medium text-gain text-sm">100% Buyer Protection</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your money is safe until you confirm receipt
          </p>
        </div>

        {/* Grading Upsell */}
        {gradingAvailable && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-400/10 border border-amber-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400">
                <Award className="w-5 h-5 text-black" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Get This Card Graded</h4>
                <p className="text-xs text-muted-foreground">Professional PSA/BGS grading</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Grading service</span>
              <span className="font-bold text-foreground">${gradingPrice}</span>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Processing time</span>
              <Badge variant="outline" className="text-xs">{gradingDays} business days</Badge>
            </div>
            
            {onRequestGrading && (
              <Button 
                variant="outline" 
                onClick={onRequestGrading}
                className="w-full border-amber-500/30 hover:bg-amber-500/10 gap-2"
              >
                <Award className="w-4 h-4" />
                Add Grading Service
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
