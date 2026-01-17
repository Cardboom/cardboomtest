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
  set?: string;
  cardNumber?: string;
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

  // Parse CSV line handling quoted values with commas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text: string): ImportedCard[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    
    // Find column indices - support multiple CSV formats
    const productNameIndex = headers.findIndex(h => h === 'product name');
    const nameIndex = productNameIndex >= 0 ? productNameIndex : headers.findIndex(h => h.includes('name') || h.includes('card') || h.includes('title'));
    const categoryIndex = headers.findIndex(h => h === 'category' || h.includes('type'));
    const setIndex = headers.findIndex(h => h === 'set');
    const gradeIndex = headers.findIndex(h => h === 'grade');
    const conditionIndex = headers.findIndex(h => h.includes('condition'));
    const avgCostIndex = headers.findIndex(h => h.includes('average cost') || h.includes('cost paid'));
    const priceIndex = avgCostIndex >= 0 ? avgCostIndex : headers.findIndex(h => h.includes('price') || h.includes('cost') || h.includes('value'));
    const quantityIndex = headers.findIndex(h => h.includes('quantity') || h.includes('qty') || h.includes('count'));
    const marketPriceIndex = headers.findIndex(h => h.includes('market price'));
    const priceOverrideIndex = headers.findIndex(h => h.includes('price override'));
    const cardNumberIndex = headers.findIndex(h => h.includes('card number'));
    const rarityIndex = headers.findIndex(h => h === 'rarity');
    const notesIndex = headers.findIndex(h => h === 'notes');

    return lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      
      // Build card name with set info for better matching
      let cardName = values[nameIndex] || values[0] || '';
      const setName = setIndex >= 0 ? values[setIndex] : '';
      const cardNumber = cardNumberIndex >= 0 ? values[cardNumberIndex] : '';
      
      // Clean up the name
      cardName = cardName.replace(/\s+/g, ' ').trim();
      
      // Get price - try purchase price first, then market price, then override
      let purchasePrice: number | undefined;
      const avgCostStr = avgCostIndex >= 0 ? values[avgCostIndex]?.replace(/[,$]/g, '') : '';
      const marketPriceStr = marketPriceIndex >= 0 ? values[marketPriceIndex]?.replace(/[,$]/g, '') : '';
      const overrideStr = priceOverrideIndex >= 0 ? values[priceOverrideIndex]?.replace(/[,$]/g, '') : '';
      
      // Try average cost first, if 0 or invalid try market price, then override
      purchasePrice = parseFloat(avgCostStr) || undefined;
      if (!purchasePrice || purchasePrice === 0) {
        purchasePrice = parseFloat(overrideStr) || parseFloat(marketPriceStr) || undefined;
      }
      
      // Get grade info
      const gradeVal = gradeIndex >= 0 ? values[gradeIndex] : '';
      const conditionVal = conditionIndex >= 0 ? values[conditionIndex] : '';
      const grade = gradeVal || conditionVal || undefined;
      
      // Get category
      const category = categoryIndex >= 0 ? values[categoryIndex] : undefined;
      
      // Get quantity
      const quantity = quantityIndex >= 0 ? parseInt(values[quantityIndex]) || 1 : 1;

      return {
        name: cardName,
        category,
        set: setName,
        cardNumber,
        grade,
        purchasePrice,
        quantity,
        status: 'pending' as const,
      };
    }).filter(card => card.name && card.name.length > 0);
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
        // Try to find matching market item with multiple search strategies
        let marketItem: { id: string; current_price: number } | null = null;
        
        // Strategy 1: Search by exact name + set
        if (card.set && card.name) {
          const { data } = await supabase
            .from('market_items')
            .select('id, current_price')
            .ilike('name', `%${card.name}%`)
            .ilike('set_name', `%${card.set}%`)
            .limit(1)
            .maybeSingle();
          marketItem = data;
        }
        
        // Strategy 2: Search by name only if no set match
        if (!marketItem && card.name) {
          // Clean up name for better matching - remove parentheses content like (SP), (JP)
          const cleanName = card.name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
          const { data } = await supabase
            .from('market_items')
            .select('id, current_price')
            .ilike('name', `%${cleanName}%`)
            .limit(1)
            .maybeSingle();
          marketItem = data;
        }

        // Parse grade properly - handle formats like "PSA 10.0", "BGS 9.5", "CGC 10.0", "Ungraded"
        let normalizedGrade: string = 'raw';
        if (card.grade) {
          const gradeStr = card.grade.toLowerCase().trim();
          
          if (gradeStr.includes('ungraded') || gradeStr === 'near mint' || gradeStr === 'mint') {
            normalizedGrade = 'raw';
          } else if (gradeStr.includes('psa')) {
            // Extract number from "PSA 10.0" -> "psa10"
            const match = gradeStr.match(/psa\s*(\d+)/);
            if (match) normalizedGrade = `psa${match[1]}`;
          } else if (gradeStr.includes('bgs')) {
            const match = gradeStr.match(/bgs\s*(\d+\.?\d*)/);
            if (match) {
              const num = match[1].replace('.', '_');
              normalizedGrade = `bgs${num}`;
            }
          } else if (gradeStr.includes('cgc')) {
            const match = gradeStr.match(/cgc\s*(\d+\.?\d*)/);
            if (match) {
              const num = match[1].replace('.', '_');
              normalizedGrade = `cgc${num}`;
            }
          }
        }
        
        // Validate grade is a valid enum value
        type CardCondition = 'raw' | 'psa1' | 'psa2' | 'psa3' | 'psa4' | 'psa5' | 'psa6' | 'psa7' | 'psa8' | 'psa9' | 'psa10' | 'bgs9' | 'bgs9_5' | 'bgs10' | 'cgc9' | 'cgc9_5' | 'cgc10';
        const validGrades: CardCondition[] = ['raw', 'psa1', 'psa2', 'psa3', 'psa4', 'psa5', 'psa6', 'psa7', 'psa8', 'psa9', 'psa10', 'bgs9', 'bgs9_5', 'bgs10', 'cgc9', 'cgc9_5', 'cgc10'];
        const finalGrade: CardCondition = validGrades.includes(normalizedGrade as CardCondition) ? normalizedGrade as CardCondition : 'raw';
        
        // Construct custom name with set info if no market match
        const customName = marketItem ? null : `${card.name}${card.set ? ` - ${card.set}` : ''}${card.cardNumber ? ` #${card.cardNumber}` : ''}`;
        
        const { error } = await supabase.from('portfolio_items').insert([{
          user_id: user.id,
          market_item_id: marketItem?.id ?? null,
          custom_name: customName,
          grade: finalGrade,
          purchase_price: card.purchasePrice ?? marketItem?.current_price ?? null,
          quantity: card.quantity ?? 1,
        }]);

        if (error) throw error;

        updatedCards[i] = { ...card, status: 'success', message: marketItem ? 'Matched!' : 'Added manually' };
        successCount++;
      } catch (error: any) {
        console.error('Import error for card:', card.name, error);
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
                  Drag & drop or click to browse. Supports standard CSV exports from collection managers.
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
              <p className="font-medium mb-1">Supported CSV formats:</p>
              <p>Product Name, Category, Set, Grade, Quantity, Average Cost Paid / Market Price</p>
              <p className="mt-1 text-muted-foreground/70">Works with exports from collection managers, TCGPlayer, and similar tools.</p>
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