import { useState } from 'react';
import { Copy, Check, Building2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WireTransferInfoProps {
  onClose?: () => void;
}

// Cardboom's bank details
const CARDBOOM_IBAN = 'TR49 0086 4011 0000 8249 9298 45';
const CARDBOOM_BANK = 'BRAINBABY BİLİŞİM ANONİM ŞİRKETİ';

export const WireTransferInfo = ({ onClose }: WireTransferInfoProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="glass rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-platinum">Wire Transfer</h3>
          <p className="text-platinum/60 text-sm">Add funds via bank transfer</p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-platinum font-medium">Important Instructions</p>
            <ul className="text-platinum/70 text-sm space-y-1">
              <li>• Include your <span className="text-gold font-semibold">Cardboom Username</span> in the transfer description</li>
              <li>• IBAN transfers take <span className="text-gold font-semibold">1-2 business days</span> to process</li>
              <li>• Commission: 1.25% of transfer amount</li>
            </ul>
          </div>
        </div>
      </div>


      {/* Bank Details */}
      <div className="space-y-3">
        <h4 className="text-platinum font-medium">Cardboom Bank Details</h4>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-obsidian/30 rounded-lg">
            <div>
              <p className="text-platinum/50 text-xs">Account Name</p>
              <p className="text-platinum font-medium text-sm">{CARDBOOM_BANK}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(CARDBOOM_BANK, 'Account Name')}
              className="text-platinum/60 hover:text-platinum"
            >
              {copied === 'Account Name' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-obsidian/30 rounded-lg">
            <div>
              <p className="text-platinum/50 text-xs">IBAN</p>
              <p className="text-platinum font-mono text-sm">{CARDBOOM_IBAN}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(CARDBOOM_IBAN.replace(/\s/g, ''), 'IBAN')}
              className="text-platinum/60 hover:text-platinum"
            >
              {copied === 'IBAN' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Processing Info */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <span className="text-blue-400 font-medium">Processing Time</span>
        </div>
        <p className="text-platinum/60 text-sm">1-2 business days</p>
      </div>

      {/* Withdrawal Notice */}
      <div className="bg-platinum/5 border border-platinum/10 rounded-lg p-4">
        <p className="text-platinum/60 text-sm">
          <span className="text-platinum font-medium">Withdrawal Policy:</span> If your account balance originates from bank transfers, 
          withdrawals can only be made to your registered IBAN. Cardboom reserves the right to hold assets until transfers are fully confirmed.
        </p>
      </div>
    </div>
  );
};
