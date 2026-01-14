import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface GradingOrder {
  id: string;
  cbgi_score_0_100?: number | null;
  estimated_psa_range?: string | null;
  corners_grade?: number | null;
  edges_grade?: number | null;
  surface_grade?: number | null;
  centering_grade?: number | null;
  eye_appeal_grade?: number | null;
  grading_notes?: string | null;
  grade_label?: string | null;
}

interface EditGradingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: GradingOrder;
  onSaved: () => void;
}

export function EditGradingDialog({ open, onOpenChange, order, onSaved }: EditGradingDialogProps) {
  const [saving, setSaving] = useState(false);
  // Normalize score to 0-10 scale for display/editing
  const normalizeScore = (score: number | null | undefined): number => {
    if (!score) return 0;
    return score > 10 ? score / 10 : score;
  };

  const [formData, setFormData] = useState({
    cbgi_score: normalizeScore(order.cbgi_score_0_100), // Store as 0-10 for editing
    estimated_psa_range: order.estimated_psa_range || '',
    corners_grade: normalizeScore(order.corners_grade),
    edges_grade: normalizeScore(order.edges_grade),
    surface_grade: normalizeScore(order.surface_grade),
    centering_grade: normalizeScore(order.centering_grade),
    eye_appeal_grade: normalizeScore(order.eye_appeal_grade),
    grading_notes: order.grading_notes || '',
    grade_label: order.grade_label || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert 0-10 score back to 0-100 for storage
      const scoreFor100Scale = formData.cbgi_score * 10;
      
      const { error } = await supabase
        .from('grading_orders')
        .update({
          cbgi_score_0_100: scoreFor100Scale,
          estimated_psa_range: formData.estimated_psa_range,
          corners_grade: formData.corners_grade,
          edges_grade: formData.edges_grade,
          surface_grade: formData.surface_grade,
          centering_grade: formData.centering_grade,
          eye_appeal_grade: formData.eye_appeal_grade,
          grading_notes: formData.grading_notes,
          grade_label: formData.grade_label,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      // Log the admin action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_log').insert({
          admin_id: user.id,
          action: 'edit_grading_result',
          target_type: 'grading_order',
          target_id: order.id,
          details: {
            original: {
              cbgi_score: normalizeScore(order.cbgi_score_0_100),
              estimated_psa_range: order.estimated_psa_range,
            },
            updated: {
              cbgi_score: formData.cbgi_score,
              estimated_psa_range: formData.estimated_psa_range,
            },
          },
        });
      }

      toast.success('Grading results updated');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('Error updating grading:', err);
      toast.error('Failed to update grading results');
    } finally {
      setSaving(false);
    }
  };

  const getPSALabel = (score: number) => {
    if (score >= 9.5) return 'GEM MINT';
    if (score >= 8.5) return 'MINT';
    if (score >= 7.5) return 'NM-MT';
    if (score >= 6.5) return 'NM';
    if (score >= 5.5) return 'EX-MT';
    return 'EX';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Grading Results</DialogTitle>
          <DialogDescription>
            Modify the AI grading results for order {order.id.slice(0, 8)}...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Main Score */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CBGI Score (0-10)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={formData.cbgi_score}
                onChange={(e) => {
                  const score = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({
                    ...prev,
                    cbgi_score: score,
                    grade_label: `CB ${score.toFixed(1)} - ${getPSALabel(score)}`,
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Est. PSA Range</Label>
              <Input
                value={formData.estimated_psa_range}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_psa_range: e.target.value }))}
                placeholder="PSA 8-9"
              />
            </div>
          </div>

          {/* Sub-grades */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Corners (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={formData.corners_grade}
                onChange={(e) => setFormData(prev => ({ ...prev, corners_grade: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Edges (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={formData.edges_grade}
                onChange={(e) => setFormData(prev => ({ ...prev, edges_grade: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Surface (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={formData.surface_grade}
                onChange={(e) => setFormData(prev => ({ ...prev, surface_grade: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Centering (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={formData.centering_grade}
                onChange={(e) => setFormData(prev => ({ ...prev, centering_grade: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          {/* Eye Appeal */}
          <div className="space-y-2">
            <Label className="text-xs">Eye Appeal (1-10)</Label>
            <Input
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={formData.eye_appeal_grade}
              onChange={(e) => setFormData(prev => ({ ...prev, eye_appeal_grade: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          {/* Grade Label */}
          <div className="space-y-2">
            <Label>Grade Label</Label>
            <Input
              value={formData.grade_label}
              onChange={(e) => setFormData(prev => ({ ...prev, grade_label: e.target.value }))}
              placeholder="CBGI 8.5 - MINT"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Grading Notes</Label>
            <Textarea
              value={formData.grading_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, grading_notes: e.target.value }))}
              placeholder="Admin notes about this grade..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}