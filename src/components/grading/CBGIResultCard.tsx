import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GradingOrder } from '@/hooks/useGrading';
import { Award, Target, Layers, CornerDownRight, Maximize2, Sparkles, AlertTriangle, Info, Shield, TrendingUp, DollarSign, ArrowUpRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { GradingFeedbackDialog } from './GradingFeedbackDialog';
interface CBGIResultCardProps {
  order: GradingOrder;
}

const RISK_FLAG_TOOLTIPS: Record<string, string> = {
  GLARE: 'Reflective glare may hide surface scratches or print lines.',
  LOW_RES: 'Low resolution limits accurate surface detection.',
  SLEEVE: 'Sleeve/toploader may distort edge and corner visibility.',
  PRINT_LINES_RISK: 'Potential factory print lines detected on surface.',
  CENTERING_SEVERE: 'Significant centering deviation detected.',
  SURFACE_WEAR: 'Visible surface wear or scratches detected.',
  CORNER_DAMAGE: 'Notable corner damage or whitening present.',
};

const CONFIDENCE_COLORS = {
  low: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  medium: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  high: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
};

export function CBGIResultCard({ order }: CBGIResultCardProps) {
  // Score is now 0-10 scale stored in final_grade or cbgi_score_0_100
  const cbgiScore = order.final_grade ?? order.cbgi_score_0_100 ?? null;
  const cbgiJson = order.cbgi_json as any;
  const confidence = order.cbgi_confidence || 'medium';
  const riskFlags = order.cbgi_risk_flags || [];
  const psaRange = order.estimated_psa_range || cbgiJson?.estimated_psa_range;

  const getScoreColor = (score: number | null) => {
    if (!score) return 'from-muted to-muted';
    if (score >= 9.5) return 'from-amber-400 to-yellow-500';
    if (score >= 8.5) return 'from-emerald-400 to-green-500';
    if (score >= 7.5) return 'from-blue-400 to-cyan-500';
    if (score >= 6.5) return 'from-purple-400 to-violet-500';
    return 'from-gray-400 to-slate-500';
  };

  // Extract analysis from cbgi_json or use individual grade fields
  const analysis = cbgiJson?.analysis || {};
  const subgrades = [
    { 
      name: 'Centering', 
      value: analysis.centering?.score ?? order.centering_grade, 
      notes: analysis.centering?.notes,
      icon: Maximize2,
      weight: '20%'
    },
    { 
      name: 'Corners', 
      value: analysis.corners?.score ?? order.corners_grade, 
      notes: analysis.corners?.notes,
      icon: CornerDownRight,
      weight: '20%'
    },
    { 
      name: 'Edges', 
      value: analysis.edges?.score ?? order.edges_grade, 
      notes: analysis.edges?.notes,
      icon: Layers,
      weight: '20%'
    },
    { 
      name: 'Surface', 
      value: analysis.surface?.score ?? order.surface_grade, 
      notes: analysis.surface?.notes,
      icon: Target,
      weight: '30%'
    },
    { 
      name: 'Eye Appeal', 
      value: analysis.eye_appeal?.score ?? order.eye_appeal_grade, 
      notes: analysis.eye_appeal?.notes,
      icon: Sparkles,
      weight: '10%'
    },
  ];

  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur">
      <CardContent className="p-6">
        {/* Main Score Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-4 mb-6"
        >
          <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${getScoreColor(cbgiScore)} flex items-center justify-center shadow-lg relative`}>
            <span className="text-3xl font-bold text-white drop-shadow">
              {cbgiScore !== null ? cbgiScore.toFixed(1) : '—'}
            </span>
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1.5 shadow-md">
              <Shield className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
                CardBoom Grading Index
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">CBGI uses AI vision analysis to evaluate centering, corners, edges, surface, and eye appeal with conservative scoring standards.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <h3 className="text-2xl font-bold">{order.grade_label || 'Pending'}</h3>
            
            {/* PSA Range & Confidence */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {psaRange && (
                <Badge variant="outline" className="text-xs font-medium">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Est. {psaRange}
                </Badge>
              )}
              <Badge 
                variant="outline" 
                className={`text-xs font-medium capitalize ${CONFIDENCE_COLORS[confidence as keyof typeof CONFIDENCE_COLORS] || CONFIDENCE_COLORS.medium}`}
              >
                {confidence} confidence
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Card info if available */}
        {(order.card_name || cbgiJson?.card_name) && (
          <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-sm font-medium">{cbgiJson?.card_name || order.card_name}</p>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
              {(cbgiJson?.set || order.set_name) && <span>{cbgiJson?.set || order.set_name}</span>}
              {order.card_number && <span>#{order.card_number}</span>}
              {order.rarity && <Badge variant="outline" className="text-xs h-5">{order.rarity}</Badge>}
            </div>
          </div>
        )}

        {/* Estimated Value Section */}
        {(order.estimated_value_raw || order.estimated_value_graded) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4 p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Estimated Value</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Raw / Ungraded</p>
                <p className="text-xl font-bold text-foreground">
                  ${order.estimated_value_raw?.toFixed(2) || '—'}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Graded Value</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${order.estimated_value_graded?.toFixed(2) || '—'}
                </p>
              </div>
            </div>
            {order.value_increase_percent && order.value_increase_percent > 0 && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-sm font-semibold">+{order.value_increase_percent}% value increase with grading</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 text-center">
              AI-estimated values based on current market data
            </p>
          </motion.div>
        )}
        {riskFlags.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Risk Factors</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                {riskFlags.map((flag) => (
                  <Tooltip key={flag}>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 cursor-help"
                      >
                        {flag.replace(/_/g, ' ')}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">{RISK_FLAG_TOOLTIPS[flag] || 'Risk factor detected'}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </motion.div>
        )}

        {/* Subgrade Breakdown */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Subgrade Breakdown
          </h4>
          
          {subgrades.map((subgrade, index) => (
            <motion.div 
              key={subgrade.name} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <subgrade.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{subgrade.name}</span>
                  <span className="text-xs text-muted-foreground">({subgrade.weight})</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="font-mono cursor-help">
                        {subgrade.value?.toFixed(1) || '—'}
                      </Badge>
                    </TooltipTrigger>
                    {subgrade.notes && (
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">{subgrade.notes}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Progress 
                value={subgrade.value ? (subgrade.value / 10) * 100 : 0} 
                className="h-2"
              />
            </motion.div>
          ))}
        </div>

        {/* Feedback Button - help train the model */}
        {cbgiScore && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-4"
          >
            <GradingFeedbackDialog orderId={order.id} cbgiScore={cbgiScore} />
          </motion.div>
        )}

        {/* Disclaimer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10"
        >
          <div className="flex items-center gap-2 text-xs text-primary">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-medium">CardBoom Grading Index (CBGI)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            This is the CardBoom Grading Index. We do our best to grade with our fine-tuned AI system powered by Brainbaby.
          </p>
        </motion.div>
      </CardContent>
    </Card>
  );
}