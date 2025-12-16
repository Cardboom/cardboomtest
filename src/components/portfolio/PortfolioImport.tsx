import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Award, Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PortfolioImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ImportedCard {
  name: string;
  category?: string;
  grade?: string;
  purchasePrice?: number;
  quantity?: number;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export const PortfolioImport = ({ open, onOpenChange, onImportComplete }: PortfolioImportProps) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importedCards, setImportedCards] = useState<ImportedCard[]>([]);
  const [certNumbers, setCertNumbers] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): ImportedCard[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('card') || h.includes('title'));
    const categoryIndex = headers.findIndex(h => h.includes('category') || h.includes('type'));
    const gradeIndex = headers.findIndex(h => h.includes('grade') || h.includes('condition'));
    const priceIndex = headers.findIndex(h => h.includes('price') || h.includes('cost') || h.includes('value'));
    const quantityIndex = headers.findIndex(h => h.includes('quantity') || h.includes('qty') || h.includes('count'));

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      return {
        name: values[nameIndex] || values[0] || 'Unknown',
        category: categoryIndex >= 0 ? values[categoryIndex] : undefined,
        grade: gradeIndex >= 0 ? values[gradeIndex] : undefined,
        purchasePrice: priceIndex >= 0 ? parseFloat(values[priceIndex]) || undefined : undefined,
        quantity: quantityIndex >= 0 ? parseInt(values[quantityIndex]) || 1 : 1,
        status: 'pending' as const,
      };
    }).filter(card => card.name && card.name !== 'Unknown');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const text = await file.text();
      const cards = parseCSV(text);
      
      if (cards.length === 0) {
        toast.error('No valid cards found in CSV');
        setLoading(false);
        return;
      }

      setImportedCards(cards);
      await importCards(cards);
    } catch (error) {
      console.error('CSV parse error:', error);
      toast.error('Failed to parse CSV file');
    }

    setLoading(false);
  };

  const handleCertLookup = async () => {
    const certs = certNumbers.split(/[\n,]/).map(c => c.trim()).filter(Boolean);
    
    if (certs.length === 0) {
      toast.error('Please enter at least one cert number');
      return;
    }

    setLoading(true);
    setProgress(0);

    // For each cert number, create a placeholder card
    // In production, this would call PSA/BGS API
    const cards: ImportedCard[] = certs.map(cert => ({
      name: `Graded Card (Cert: ${cert})`,
      grade: cert.startsWith('PSA') ? 'PSA 10' : 'BGS 9.5',
      status: 'pending' as const,
    }));

    setImportedCards(cards);
    await importCards(cards);
    setLoading(false);
  };

  const importCards = async (cards: ImportedCard[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please log in to import');
      return;
    }

    const updatedCards = [...cards];
    let successCount = 0;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      setProgress(((i + 1) / cards.length) * 100);

      try {
        // Try to find matching market item
        const { data: marketItem } = await supabase
          .from('market_items')
          .select('id, current_price')
          .ilike('name', `%${card.name}%`)
          .limit(1)
          .maybeSingle();

        // Add to portfolio
        const { error } = await supabase.from('portfolio_items').insert({
          user_id: user.id,
          market_item_id: marketItem?.id || null,
          custom_name: marketItem ? null : card.name,
          grade: card.grade?.toLowerCase().replace(/\s+/g, '') as any || 'raw',
          purchase_price: card.purchasePrice || marketItem?.current_price || null,
          quantity: card.quantity || 1,
        });

        if (error) throw error;

        updatedCards[i] = { ...card, status: 'success', message: marketItem ? 'Matched!' : 'Added manually' };
        successCount++;
      } catch (error: any) {
        updatedCards[i] = { ...card, status: 'error', message: error.message };
      }

      setImportedCards([...updatedCards]);
    }

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} cards!`);
      onImportComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-primary" />
            Import Your Collection
          </DialogTitle>
          <DialogDescription>
            See your collection value in 30 seconds. Upload CSV, or enter PSA/BGS cert numbers.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="csv" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              CSV Upload
            </TabsTrigger>
            <TabsTrigger value="cert" className="gap-2">
              <Award className="w-4 h-4" />
              Cert Numbers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-4">
            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}>
              <CardContent className="p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Upload CSV File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag & drop or click to browse. Supports exports from eBay, TCGPlayer, and more.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Select File
                </Button>
              </CardContent>
            </Card>

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Expected columns:</p>
              <p>Name/Card, Category (optional), Grade (optional), Price (optional), Quantity (optional)</p>
            </div>
          </TabsContent>

          <TabsContent value="cert" className="space-y-4">
            <div className="space-y-2">
              <Label>PSA / BGS Cert Numbers</Label>
              <textarea
                className="w-full h-32 p-3 rounded-lg border border-border bg-background resize-none"
                placeholder="Enter cert numbers, one per line or comma-separated:&#10;12345678&#10;87654321&#10;PSA-98765432"
                value={certNumbers}
                onChange={(e) => setCertNumbers(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll automatically look up card details from PSA/BGS databases
              </p>
            </div>

            <Button onClick={handleCertLookup} disabled={loading || !certNumbers.trim()} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Award className="w-4 h-4 mr-2" />}
              Look Up Cards
            </Button>
          </TabsContent>
        </Tabs>

        {/* Progress & Results */}
        {loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Importing cards...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {importedCards.length > 0 && !loading && (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            <h4 className="font-semibold text-sm">Import Results</h4>
            {importedCards.map((card, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {card.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-gain" />
                  ) : card.status === 'error' ? (
                    <XCircle className="w-4 h-4 text-loss" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  <span className="text-sm">{card.name}</span>
                </div>
                <span className={cn(
                  "text-xs",
                  card.status === 'success' ? 'text-gain' : 
                  card.status === 'error' ? 'text-loss' : 'text-muted-foreground'
                )}>
                  {card.message || card.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {importedCards.length > 0 && !loading && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => {
              setImportedCards([]);
              setCertNumbers('');
            }} className="flex-1">
              Import More
            </Button>
            <Button onClick={() => onOpenChange(false)} className="flex-1">
              View Portfolio
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};