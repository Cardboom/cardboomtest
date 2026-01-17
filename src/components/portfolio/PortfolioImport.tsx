import { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Award, Loader2, CheckCircle2, XCircle, Sparkles, ChevronLeft, Search, Lock } from 'lucide-react';
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
  selected: boolean;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

type ImportStep = 'upload' | 'select' | 'importing' | 'results';

export const PortfolioImport = ({ open, onOpenChange, onImportComplete }: PortfolioImportProps) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedCards, setParsedCards] = useState<ImportedCard[]>([]);
  const [importedCards, setImportedCards] = useState<ImportedCard[]>([]);
  const [certNumbers, setCertNumbers] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter cards by search
  const filteredCards = useMemo(() => {
    if (!searchFilter.trim()) return parsedCards;
    const q = searchFilter.toLowerCase();
    return parsedCards.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.set?.toLowerCase().includes(q) ||
      c.grade?.toLowerCase().includes(q)
    );
  }, [parsedCards, searchFilter]);

  // Count selected
  const selectedCount = parsedCards.filter(c => c.selected).length;

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

    return lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      
      let cardName = values[nameIndex] || values[0] || '';
      const setName = setIndex >= 0 ? values[setIndex] : '';
      const cardNumber = cardNumberIndex >= 0 ? values[cardNumberIndex] : '';
      
      cardName = cardName.replace(/\s+/g, ' ').trim();
      
      let purchasePrice: number | undefined;
      const avgCostStr = avgCostIndex >= 0 ? values[avgCostIndex]?.replace(/[,$]/g, '') : '';
      const marketPriceStr = marketPriceIndex >= 0 ? values[marketPriceIndex]?.replace(/[,$]/g, '') : '';
      const overrideStr = priceOverrideIndex >= 0 ? values[priceOverrideIndex]?.replace(/[,$]/g, '') : '';
      
      purchasePrice = parseFloat(avgCostStr) || undefined;
      if (!purchasePrice || purchasePrice === 0) {
        purchasePrice = parseFloat(overrideStr) || parseFloat(marketPriceStr) || undefined;
      }
      
      const gradeVal = gradeIndex >= 0 ? values[gradeIndex] : '';
      const conditionVal = conditionIndex >= 0 ? values[conditionIndex] : '';
      const grade = gradeVal || conditionVal || undefined;
      const category = categoryIndex >= 0 ? values[categoryIndex] : undefined;
      const quantity = quantityIndex >= 0 ? parseInt(values[quantityIndex]) || 1 : 1;

      return {
        name: cardName,
        category,
        set: setName,
        cardNumber,
        grade,
        purchasePrice,
        quantity,
        selected: true, // Default selected
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

    try {
      const text = await file.text();
      const cards = parseCSV(text);
      
      if (cards.length === 0) {
        toast.error('No valid cards found in CSV');
        setLoading(false);
        return;
      }

      setParsedCards(cards);
      setStep('select');
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

    const cards: ImportedCard[] = certs.map(cert => ({
      name: `Graded Card (Cert: ${cert})`,
      grade: cert.startsWith('PSA') ? 'PSA 10' : 'BGS 9.5',
      selected: true,
      status: 'pending' as const,
    }));

    setParsedCards(cards);
    setStep('select');
  };

  const toggleCard = (index: number) => {
    setParsedCards(prev => prev.map((card, i) => 
      i === index ? { ...card, selected: !card.selected } : card
    ));
  };

  const toggleAll = (selected: boolean) => {
    setParsedCards(prev => prev.map(card => ({ ...card, selected })));
  };

  const handleImportSelected = async () => {
    const cardsToImport = parsedCards.filter(c => c.selected);
    if (cardsToImport.length === 0) {
      toast.error('Please select at least one card to import');
      return;
    }

    setStep('importing');
    setLoading(true);
    setProgress(0);

    await importCards(cardsToImport);
    
    setLoading(false);
    setStep('results');
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
          const cleanName = card.name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
          const { data } = await supabase
            .from('market_items')
            .select('id, current_price')
            .ilike('name', `%${cleanName}%`)
            .limit(1)
            .maybeSingle();
          marketItem = data;
        }

        // Parse grade properly
        let normalizedGrade: string = 'raw';
        if (card.grade) {
          const gradeStr = card.grade.toLowerCase().trim();
          
          if (gradeStr.includes('ungraded') || gradeStr === 'near mint' || gradeStr === 'mint') {
            normalizedGrade = 'raw';
          } else if (gradeStr.includes('psa')) {
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
        
        type CardCondition = 'raw' | 'psa1' | 'psa2' | 'psa3' | 'psa4' | 'psa5' | 'psa6' | 'psa7' | 'psa8' | 'psa9' | 'psa10' | 'bgs9' | 'bgs9_5' | 'bgs10' | 'cgc9' | 'cgc9_5' | 'cgc10';
        const validGrades: CardCondition[] = ['raw', 'psa1', 'psa2', 'psa3', 'psa4', 'psa5', 'psa6', 'psa7', 'psa8', 'psa9', 'psa10', 'bgs9', 'bgs9_5', 'bgs10', 'cgc9', 'cgc9_5', 'cgc10'];
        const finalGrade: CardCondition = validGrades.includes(normalizedGrade as CardCondition) ? normalizedGrade as CardCondition : 'raw';
        
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
      toast.success(`Successfully added ${successCount} cards to your Digital Vault!`);
      onImportComplete();
    }
  };

  const resetImport = () => {
    setStep('upload');
    setParsedCards([]);
    setImportedCards([]);
    setCertNumbers('');
    setSearchFilter('');
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetImport();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-primary" />
            Import to Digital Vault
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            Private collection — only you can see these items
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
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
                    Drag & drop or click to browse. You'll be able to select which cards to add.
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
              </div>
            </TabsContent>

            <TabsContent value="cert" className="space-y-4">
              <div className="space-y-2">
                <Label>PSA / BGS Cert Numbers</Label>
                <textarea
                  className="w-full h-32 p-3 rounded-lg border border-border bg-background resize-none"
                  placeholder="Enter cert numbers, one per line or comma-separated:&#10;12345678&#10;87654321"
                  value={certNumbers}
                  onChange={(e) => setCertNumbers(e.target.value)}
                />
              </div>

              <Button onClick={handleCertLookup} disabled={loading || !certNumbers.trim()} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Award className="w-4 h-4 mr-2" />}
                Look Up Cards
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {/* Step: Select Cards */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')} className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedCount} of {parsedCards.length} selected
              </span>
            </div>

            {/* Search & Select All */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search cards..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => toggleAll(selectedCount < parsedCards.length)}
              >
                {selectedCount === parsedCards.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {/* Card List */}
            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
              {filteredCards.map((card, i) => {
                const originalIndex = parsedCards.findIndex(c => c === card);
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                      card.selected ? "bg-primary/10 border border-primary/30" : "bg-muted/50 hover:bg-muted"
                    )}
                    onClick={() => toggleCard(originalIndex)}
                  >
                    <Checkbox 
                      checked={card.selected} 
                      onCheckedChange={() => toggleCard(originalIndex)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{card.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {card.set && <span>{card.set}</span>}
                        {card.grade && <span className="text-primary">• {card.grade}</span>}
                        {card.quantity && card.quantity > 1 && <span>• x{card.quantity}</span>}
                      </div>
                    </div>
                    {card.purchasePrice && (
                      <span className="text-sm font-medium text-muted-foreground">
                        ${card.purchasePrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
              {filteredCards.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No cards match your search</p>
              )}
            </div>

            {/* Import Button */}
            <Button 
              onClick={handleImportSelected} 
              disabled={selectedCount === 0}
              className="w-full"
            >
              Add {selectedCount} Cards to Digital Vault
            </Button>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
              <h3 className="font-semibold">Adding to Digital Vault...</h3>
              <p className="text-sm text-muted-foreground">This may take a moment</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}

        {/* Step: Results */}
        {step === 'results' && (
          <div className="space-y-4">
            <div className="space-y-3 max-h-60 overflow-y-auto">
              <h4 className="font-semibold text-sm">Import Results</h4>
              {importedCards.map((card, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    {card.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-gain flex-shrink-0" />
                    ) : card.status === 'error' ? (
                      <XCircle className="w-4 h-4 text-loss flex-shrink-0" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    )}
                    <span className="text-sm truncate">{card.name}</span>
                  </div>
                  <span className={cn(
                    "text-xs flex-shrink-0 ml-2",
                    card.status === 'success' ? 'text-gain' : 
                    card.status === 'error' ? 'text-loss' : 'text-muted-foreground'
                  )}>
                    {card.message || card.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetImport} className="flex-1">
                Import More
              </Button>
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                View Portfolio
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
