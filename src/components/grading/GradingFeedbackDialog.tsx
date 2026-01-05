import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GradingFeedbackDialogProps {
  orderId: string;
  cbgiScore: number;
}

const PSA_GRADES = ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'Auth'];
const GRADING_COMPANIES = ['PSA', 'BGS', 'CGC', 'SGC'];

export function GradingFeedbackDialog({ orderId, cbgiScore }: GradingFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actualGrade, setActualGrade] = useState('');
  const [company, setCompany] = useState('PSA');
  const [notes, setNotes] = useState('');

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

      toast.success('Thank you! Your feedback helps improve our AI grading.');
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
          <MessageSquarePlus className="h-4 w-4" />
          Report Actual Grade
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Help Improve CBGI Accuracy</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          If you've had this card professionally graded, share the actual result to help us improve.
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
            <Label>Additional Notes (optional)</Label>
            <Textarea 
              placeholder="Any observations about the card condition..."
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
            Submit Feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
