import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GradingOrder } from '@/hooks/useGrading';
import { Award, CornerDownRight, Layers, Target, Maximize2 } from 'lucide-react';

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

  const getProgressColor = (grade: number | null) => {
    if (!grade) return 'bg-muted';
    if (grade >= 9) return 'bg-emerald-500';
    if (grade >= 8) return 'bg-blue-500';
    if (grade >= 7) return 'bg-purple-500';
    if (grade >= 5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const subgrades = [
    { name: 'Corners', value: order.corners_grade, icon: CornerDownRight },
    { name: 'Edges', value: order.edges_grade, icon: Layers },
    { name: 'Surface', value: order.surface_grade, icon: Target },
    { name: 'Centering', value: order.centering_grade, icon: Maximize2 },
  ];

  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-20 h-20 rounded-2xl ${getGradeColor(order.final_grade)} flex items-center justify-center shadow-lg`}>
            <span className="text-3xl font-bold text-white drop-shadow">
              {order.final_grade?.toFixed(1) || '—'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground uppercase tracking-wide">AI Grade</span>
            </div>
            <h3 className="text-2xl font-bold">{order.grade_label || 'Pending'}</h3>
            {order.confidence && (
              <p className="text-sm text-muted-foreground">
                Confidence: {(order.confidence * 100).toFixed(0)}%
              </p>
            )}
          </div>
        </div>

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
                <Badge variant="secondary" className="font-mono">
                  {subgrade.value?.toFixed(1) || '—'}
                </Badge>
              </div>
              <Progress 
                value={subgrade.value ? (subgrade.value / 10) * 100 : 0} 
                className="h-2"
              />
            </div>
          ))}
        </div>

        {order.grading_notes && (
          <div className="mt-6 p-4 rounded-lg bg-muted/50">
            <h4 className="text-sm font-semibold mb-2">Notes</h4>
            <p className="text-sm text-muted-foreground">{order.grading_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
