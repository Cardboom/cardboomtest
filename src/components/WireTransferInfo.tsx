import { useState } from 'react';
import { Copy, Check, Building2, AlertCircle, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WireTransferInfoProps {
  onClose?: () => void;
}

// Cardboom's bank details - EXACT as required
const CARDBOOM_IBAN = 'TR490086401100008249929845';
const CARDBOOM_IBAN_FORMATTED = 'TR49 0086 4011 0000 8249 9298 45';
const CARDBOOM_BANK = 'BRAINBABY BILISIM ANONIM SIRKETI';
const WIRE_TRANSFER_FEE = 3; // 3%
const FLAT_FEE = 0.5; // $0.50 flat fee on all transfers

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
          <h3 className="text-lg font-semibold text-platinum">Wire Transfer (EFT/Havale)</h3>
          <p className="text-platinum/60 text-sm">Add funds via domestic bank transfer</p>
        </div>
      </div>

      {/* Critical User Instruction */}
      <div className="bg-gold/20 border-2 border-gold rounded-lg p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-platinum font-bold text-base">⚠️ IMPORTANT - READ CAREFULLY</p>
            <p className="text-platinum font-medium">
              After creating a custom name in your profile, you must write your <span className="text-gold font-bold">username</span> in the transfer description/reference so the balance can be credited correctly.
            </p>
          </div>
        </div>
      </div>

      {/* Transfer Restrictions */}
      <div className="bg-loss/10 border border-loss/30 rounded-lg p-4 space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-loss shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-platinum font-medium">Transfer Requirements</p>
            <ul className="text-platinum/70 text-sm space-y-1">
              <li>• <span className="text-loss font-semibold">Currency: TRY only</span> (Turkish Lira)</li>
              <li>• <span className="text-loss font-semibold">Domestic TR transfers only</span> (EFT/Havale)</li>
              <li>• International transfers will NOT be credited</li>
              <li>• Fee: <span className="text-platinum font-semibold">{WIRE_TRANSFER_FEE}%</span> + <span className="text-platinum font-semibold">${FLAT_FEE}</span> flat fee</li>
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
              <p className="text-platinum/50 text-xs">Beneficiary Name (Alıcı Adı)</p>
              <p className="text-platinum font-medium text-sm">{CARDBOOM_BANK}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(CARDBOOM_BANK, 'Beneficiary Name')}
              className="text-platinum/60 hover:text-platinum"
            >
              {copied === 'Beneficiary Name' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-obsidian/30 rounded-lg">
            <div>
              <p className="text-platinum/50 text-xs">IBAN</p>
              <p className="text-platinum font-mono text-sm">{CARDBOOM_IBAN_FORMATTED}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(CARDBOOM_IBAN, 'IBAN')}
              className="text-platinum/60 hover:text-platinum"
            >
              {copied === 'IBAN' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-obsidian/30 rounded-lg">
            <div>
              <p className="text-platinum/50 text-xs">Currency (Para Birimi)</p>
              <p className="text-platinum font-medium text-sm">TRY (Turkish Lira) - ONLY</p>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Info */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <span className="text-blue-400 font-medium">Processing Time</span>
        </div>
        <p className="text-platinum/60 text-sm">1-2 business days after username verification</p>
      </div>

      {/* Balance Will NOT Be Credited */}
      <div className="bg-loss/10 border border-loss/30 rounded-lg p-4">
        <p className="text-loss font-semibold mb-2">❌ Balance will NOT be credited if:</p>
        <ul className="text-platinum/70 text-sm space-y-1">
          <li>• Transfer reference does not include your username</li>
          <li>• Transfer is sent in a non-TRY currency</li>
          <li>• Transfer is international (non-TR domestic)</li>
        </ul>
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
