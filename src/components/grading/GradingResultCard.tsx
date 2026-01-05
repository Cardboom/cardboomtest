import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GradingOrder } from '@/hooks/useGrading';
import { Award, CornerDownRight, Layers, Target, Maximize2, Shield, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GradingResultCardProps {
  order: GradingOrder;
}

export function GradingResultCard({ order }: GradingResultCardProps) {
  const getGradeColor = (grade: number | null) => {
    if (!grade) return 'bg-muted';
    if (grade >= 9.5) return 'bg-gradient-to-r from-amber-400 to-yellow-500';
    if (grade >= 9) return 'bg-gradient-to-r from-emerald-400 to-green-500';
    if (grade >= 8) return 'bg-gradient-to-r from-blue-400 to-cyan-500';
    if (grade >= 7) return 'bg-gradient-to-r from-purple-400 to-violet-500';
    return 'bg-gradient-to-r from-gray-400 to-slate-500';
  };

  const subgrades = [
    { name: 'Corners', value: order.corners_grade, ximilar: order.ximilar_corners_grade, icon: CornerDownRight },
    { name: 'Edges', value: order.edges_grade, ximilar: order.ximilar_edges_grade, icon: Layers },
    { name: 'Surface', value: order.surface_grade, ximilar: order.ximilar_surface_grade, icon: Target },
    { name: 'Centering', value: order.centering_grade, ximilar: order.ximilar_centering_grade, icon: Maximize2 },
  ];

  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-20 h-20 rounded-2xl ${getGradeColor(order.final_grade)} flex items-center justify-center shadow-lg relative`}>
            <span className="text-3xl font-bold text-white drop-shadow">
              {order.final_grade?.toFixed(1) || '—'}
            </span>
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-md">
              <Shield className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground uppercase tracking-wide">CardBoom Grade</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">CardBoom applies a 5% conservative adjustment to ensure disciplined, heavy grading. This means our grades are more stringent than raw AI scores.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <h3 className="text-2xl font-bold">{order.grade_label || 'Pending'}</h3>
            <div className="flex items-center gap-2 mt-1">
              {order.ximilar_final_grade && (
                <span className="text-xs text-muted-foreground">
                  Raw: {order.ximilar_final_grade.toFixed(1)}
                </span>
              )}
              {order.confidence && (
                <span className="text-xs text-muted-foreground">
                  • Confidence: {(order.confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card info if available */}
        {order.card_name && (
          <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-sm font-medium">{order.card_name}</p>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
              {order.set_name && <span>{order.set_name}</span>}
              {order.card_number && <span>#{order.card_number}</span>}
              {order.rarity && <Badge variant="outline" className="text-xs h-5">{order.rarity}</Badge>}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Subgrade Breakdown
          </h4>
          
          {subgrades.map((subgrade) => (
            <div key={subgrade.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <subgrade.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{subgrade.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {subgrade.ximilar && subgrade.ximilar !== subgrade.value && (
                    <span className="text-xs text-muted-foreground line-through">
                      {subgrade.ximilar.toFixed(1)}
                    </span>
                  )}
                  <Badge variant="secondary" className="font-mono">
                    {subgrade.value?.toFixed(1) || '—'}
                  </Badge>
                </div>
              </div>
              <Progress 
                value={subgrade.value ? (subgrade.value / 10) * 100 : 0} 
                className="h-2"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 text-xs text-primary">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-medium">CardBoom Disciplined Grading</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Grades are 5% below raw AI scores to maintain strict, conservative standards.
          </p>
        </div>

        {order.grading_notes && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            <h4 className="text-sm font-semibold mb-2">Notes</h4>
            <p className="text-sm text-muted-foreground">{order.grading_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
