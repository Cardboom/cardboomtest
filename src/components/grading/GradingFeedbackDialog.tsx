import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquarePlus, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminRole } from '@/hooks/useAdminRole';

interface GradingFeedbackDialogProps {
  orderId: string;
  cbgiScore: number;
}

const PSA_GRADES = ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'Auth'];
const GRADING_COMPANIES = ['PSA', 'BGS', 'CGC', 'SGC'];

export function GradingFeedbackDialog({ orderId, cbgiScore }: GradingFeedbackDialogProps) {
  const { isAdmin, isLoading: adminLoading } = useAdminRole();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actualGrade, setActualGrade] = useState('');
  const [company, setCompany] = useState('PSA');
  const [notes, setNotes] = useState('');

  // Only admins can provide feedback
  if (adminLoading || !isAdmin) {
    return null;
  }

  const handleSubmit = async () => {
    if (!actualGrade) {
      toast.error('Please select the actual grade');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('grading_feedback').insert({
        grading_order_id: orderId,
        cbgi_score: cbgiScore,
        actual_grade: actualGrade,
        grading_company: company,
        feedback_notes: notes || null,
        submitted_by: user?.id
      });

      if (error) throw error;

      toast.success('Feedback submitted! This will help calibrate CBGI.');
      setOpen(false);
      setActualGrade('');
      setNotes('');
    } catch (err) {
      console.error('Feedback error:', err);
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ShieldCheck className="h-4 w-4" />
          Admin: Report Actual Grade
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            CBGI Calibration Feedback
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Enter the actual professional grade to help train the CBGI model.
        </p>
        
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Grading Company</Label>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADING_COMPANIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Actual Grade Received</Label>
              <Select value={actualGrade} onValueChange={setActualGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {PSA_GRADES.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observations (optional)</Label>
            <Textarea 
              placeholder="Notable condition issues, discrepancies, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <span className="text-muted-foreground">CBGI predicted: </span>
            <span className="font-bold">{cbgiScore.toFixed(1)}</span>
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit Calibration Data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
