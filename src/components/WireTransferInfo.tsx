import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Building2, AlertCircle, Clock, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WireTransferInfoProps {
  onClose?: () => void;
}

// Cardboom's bank details (placeholder - replace with actual)
const CARDBOOM_IBAN = 'TR00 0000 0000 0000 0000 0000 00';
const CARDBOOM_BANK = 'Cardboom Ödeme Hizmetleri A.Ş.';
const CARDBOOM_SWIFT = 'XXXXTRXX';

export const WireTransferInfo = ({ onClose }: WireTransferInfoProps) => {
  const [wireCode, setWireCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWireCode();
  }, []);

  const fetchWireCode = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('wire_transfer_code')
      .eq('id', user.id)
      .maybeSingle();

    if (data?.wire_transfer_code) {
      setWireCode(data.wire_transfer_code);
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-platinum/20 rounded w-48" />
          <div className="h-32 bg-platinum/10 rounded-xl" />
        </div>
      </div>
    );
  }

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
              <li>• Include your <span className="text-gold font-semibold">Transfer Code</span> in the description</li>
              <li>• Transfers under ₺100,000 are processed instantly</li>
              <li>• Larger transfers may take 1-3 business days</li>
              <li>• Commission: 1.25% of transfer amount</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Your Transfer Code */}
      {wireCode && (
        <div className="bg-obsidian/50 border border-gold/30 rounded-xl p-4">
          <p className="text-platinum/60 text-sm mb-2">Your Unique Transfer Code</p>
          <div className="flex items-center justify-between">
            <motion.span
              key={wireCode}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-2xl font-mono font-bold text-gold"
            >
              {wireCode}
            </motion.span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(wireCode, 'Transfer Code')}
              className="text-gold hover:text-gold/80"
            >
              {copied === 'Transfer Code' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Bank Details */}
      <div className="space-y-3">
        <h4 className="text-platinum font-medium">Cardboom Bank Details</h4>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-obsidian/30 rounded-lg">
            <div>
              <p className="text-platinum/50 text-xs">Account Name</p>
              <p className="text-platinum font-medium">{CARDBOOM_BANK}</p>
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
              <p className="text-platinum font-mono">{CARDBOOM_IBAN}</p>
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

          <div className="flex items-center justify-between p-3 bg-obsidian/30 rounded-lg">
            <div>
              <p className="text-platinum/50 text-xs">SWIFT/BIC Code</p>
              <p className="text-platinum font-mono">{CARDBOOM_SWIFT}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(CARDBOOM_SWIFT, 'SWIFT Code')}
              className="text-platinum/60 hover:text-platinum"
            >
              {copied === 'SWIFT Code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Processing Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">Under ₺100K</span>
          </div>
          <p className="text-platinum/60 text-sm">Instant processing</p>
        </div>
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-blue-400 font-medium">Over ₺100K</span>
          </div>
          <p className="text-platinum/60 text-sm">1-3 business days</p>
        </div>
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
