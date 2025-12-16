import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Building2 } from 'lucide-react';
import { WireTransferInfo } from './WireTransferInfo';

interface WireTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WireTransferDialog = ({ open, onOpenChange }: WireTransferDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Wire Transfer (EFT/Havale)
          </DialogTitle>
          <DialogDescription>
            Add funds via domestic Turkish bank transfer. TRY only.
          </DialogDescription>
        </DialogHeader>
        
        <WireTransferInfo onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};