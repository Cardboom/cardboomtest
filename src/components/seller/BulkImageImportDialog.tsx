import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Loader2, CheckCircle2, XCircle, Sparkles, Trash2, Edit2, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';

interface DetectedCard {
  id: string;
  file?: File;
  previewUrl: string;
  status: 'pending' | 'analyzing' | 'detected' | 'error' | 'imported';
  title: string;
  category: string;
  condition: string;
  suggestedPrice: number;
  confidence: number;
  error?: string;
  matchedItemId?: string;
  uploadedImageUrl?: string;
  sourceImageId?: string; // Links to parent batch image
}

interface BatchImage {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  detectedCount: number;
}

interface BulkImageImportDialogProps {
  onImportComplete?: () => void;
}

const CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];
const CATEGORIES = [
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'mtg', label: 'Magic: The Gathering' },
  { value: 'one-piece', label: 'One Piece' },
  { value: 'lorcana', label: 'Lorcana' },
  { value: 'nba', label: 'NBA Cards' },
  { value: 'football', label: 'Football Cards' },
  { value: 'figures', label: 'Figures' },
];

export const BulkImageImportDialog = ({ onImportComplete }: BulkImageImportDialogProps) => {
  const { formatPrice } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [cards, setCards] = useState<DetectedCard[]>([]);
  const [batchImages, setBatchImages] = useState<BatchImage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false); // Toggle: multiple cards per image
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (batchMode) {
      // Batch mode: each image may contain multiple cards
      const newBatchImages: BatchImage[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const previewUrl = URL.createObjectURL(file);
        newBatchImages.push({
          id: crypto.randomUUID(),
          file,
          previewUrl,
          status: 'pending',
          detectedCount: 0,
        });
      }

      setBatchImages(prev => [...prev, ...newBatchImages]);
      
      if (newBatchImages.length > 0) {
        analyzeBatchImages(newBatchImages);
      }
    } else {
      // Single card mode: one card per image
      const newCards: DetectedCard[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const previewUrl = URL.createObjectURL(file);
        newCards.push({
          id: crypto.randomUUID(),
          file,
          previewUrl,
          status: 'pending',
          title: '',
          category: 'pokemon',
          condition: 'Near Mint',
          suggestedPrice: 0,
          confidence: 0,
        });
      }

      setCards(prev => [...prev, ...newCards]);
      
      if (newCards.length > 0) {
        analyzeCards(newCards);
      }
    }
  }, [batchMode]);

  // Analyze batch images (multiple cards per image)
  const analyzeBatchImages = async (imagesToAnalyze: BatchImage[]) => {
    setIsAnalyzing(true);

    for (const image of imagesToAnalyze) {
      try {
        setBatchImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, status: 'analyzing' } : img
        ));

        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(image.file);
        });

        // Call analyze-card with batchMode=true
        const { data, error } = await supabase.functions.invoke('analyze-card', {
          body: { imageBase64: base64, batchMode: true }
        });

        if (error) throw error;

        const detectedCards = data.cards || [];
        
        // Create card entries for each detected card
        const newCards: DetectedCard[] = detectedCards.map((cardData: any) => ({
          id: crypto.randomUUID(),
          file: image.file,
          previewUrl: image.previewUrl,
          status: 'detected' as const,
          title: cardData.cardName || 'Unknown Card',
          category: cardData.category || 'pokemon',
          condition: cardData.estimatedCondition || 'Near Mint',
          suggestedPrice: cardData.pricing?.medianSold || cardData.pricing?.lowestActive || 0,
          confidence: cardData.confidence || 0,
          matchedItemId: cardData.matchedMarketItem?.id,
          sourceImageId: image.id,
        }));

        setCards(prev => [...prev, ...newCards]);
        
        setBatchImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, status: 'done', detectedCount: detectedCards.length } : img
        ));

        if (detectedCards.length > 0) {
          toast.success(`Detected ${detectedCards.length} card(s) in image`);
        } else {
          toast.info('No cards detected in image');
        }

      } catch (err) {
        console.error('Batch analysis error:', err);
        setBatchImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, status: 'error' } : img
        ));
        toast.error('Failed to analyze image');
      }
    }

    setIsAnalyzing(false);
  };

  // Analyze single card images
  const analyzeCards = async (cardsToAnalyze: DetectedCard[]) => {
    setIsAnalyzing(true);

    for (const card of cardsToAnalyze) {
      try {
        setCards(prev => prev.map(c => 
          c.id === card.id ? { ...c, status: 'analyzing' } : c
        ));

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(card.file!);
        });

        const { data, error } = await supabase.functions.invoke('analyze-card', {
          body: { imageBase64: base64 }
        });

        if (error) throw error;

        setCards(prev => prev.map(c => {
          if (c.id !== card.id) return c;
          
          if (data.detected && data.cardName) {
            return {
              ...c,
              status: 'detected',
              title: data.cardName,
              category: data.category || 'pokemon',
              condition: data.estimatedCondition || 'Near Mint',
              suggestedPrice: data.pricing?.medianSold || data.pricing?.lowestActive || 0,
              confidence: data.confidence || 0,
              matchedItemId: data.matchedMarketItem?.id,
            };
          } else {
            return {
              ...c,
              status: 'detected',
              title: data.ocrText?.[0] || 'Unknown Card',
              confidence: data.confidence || 0.3,
            };
          }
        }));

      } catch (err) {
        console.error('Card analysis error:', err);
        setCards(prev => prev.map(c => 
          c.id === card.id ? { 
            ...c, 
            status: 'error', 
            error: err instanceof Error ? err.message : 'Analysis failed' 
          } : c
        ));
      }
    }

    setIsAnalyzing(false);
  };

  const updateCard = (cardId: string, updates: Partial<DetectedCard>) => {
    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, ...updates } : c
    ));
  };

  const removeCard = (cardId: string) => {
    setCards(prev => {
      const card = prev.find(c => c.id === cardId);
      if (card?.previewUrl) {
        URL.revokeObjectURL(card.previewUrl);
      }
      return prev.filter(c => c.id !== cardId);
    });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('listing-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleImport = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to import listings');
      return;
    }

    const validCards = cards.filter(c => 
      c.status === 'detected' && 
      c.title.trim() && 
      c.suggestedPrice > 0
    );

    if (validCards.length === 0) {
      toast.error('No valid cards to import. Ensure all cards have names and prices.');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    let successCount = 0;

    for (let i = 0; i < validCards.length; i++) {
      const card = validCards[i];

      try {
        // Upload image first
        const imageUrl = await uploadImage(card.file);

        // Create listing
        const { error } = await supabase.from('listings').insert({
          seller_id: user.id,
          title: card.title,
          description: `AI-detected card. Category: ${card.category}. Condition: ${card.condition}.`,
          category: card.category,
          condition: card.condition,
          price: card.suggestedPrice,
          image_url: imageUrl,
          status: 'active',
          allows_vault: true,
          allows_trade: true,
          allows_shipping: true,
        });

        if (error) throw error;

        updateCard(card.id, { status: 'imported', uploadedImageUrl: imageUrl });
        successCount++;
      } catch (err) {
        console.error('Import error:', err);
        updateCard(card.id, { 
          status: 'error', 
          error: err instanceof Error ? err.message : 'Import failed' 
        });
      }

      setImportProgress(Math.round(((i + 1) / validCards.length) * 100));
    }

    setIsImporting(false);
    toast.success(`Imported ${successCount} of ${validCards.length} listings`);

    if (successCount > 0) {
      onImportComplete?.();
    }
  };

  const resetState = () => {
    cards.forEach(card => {
      if (card.previewUrl) {
        URL.revokeObjectURL(card.previewUrl);
      }
    });
    batchImages.forEach(img => {
      if (img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    setCards([]);
    setBatchImages([]);
    setImportProgress(0);
    setEditingCardId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pendingCount = cards.filter(c => ['pending', 'analyzing', 'detected'].includes(c.status)).length;
  const readyCount = cards.filter(c => c.status === 'detected' && c.title && c.suggestedPrice > 0).length;
  const errorCount = cards.filter(c => c.status === 'error').length;
  const importedCount = cards.filter(c => c.status === 'imported').length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetState();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Camera className="w-4 h-4" />
          Bulk Image Scan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Bulk Card Scanner
          </DialogTitle>
          <DialogDescription>
            Upload card images and our AI will detect names, categories, and suggest prices
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Batch Mode Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <div>
                <Label htmlFor="batch-mode" className="text-sm font-medium cursor-pointer">
                  Multiple cards per image
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable if one photo contains several cards
                </p>
              </div>
            </div>
            <Switch
              id="batch-mode"
              checked={batchMode}
              onCheckedChange={setBatchMode}
              disabled={cards.length > 0 || batchImages.length > 0}
            />
          </div>

          {/* Upload Area */}
          <div 
            className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
              disabled={isImporting}
            />
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {batchMode 
                ? 'Upload images with multiple cards - AI will detect each card'
                : 'Click or drag images here to scan cards'
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports JPG, PNG, WEBP • Multiple images allowed
            </p>
          </div>

          {/* Stats */}
          {cards.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{cards.length} cards</Badge>
              {isAnalyzing && (
                <Badge className="bg-primary/20 text-primary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Analyzing...
                </Badge>
              )}
              {readyCount > 0 && (
                <Badge className="bg-gain/20 text-gain">{readyCount} ready</Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive">{errorCount} errors</Badge>
              )}
              {importedCount > 0 && (
                <Badge className="bg-gain/20 text-gain">{importedCount} imported</Badge>
              )}
            </div>
          )}

          {/* Card List */}
          {cards.length > 0 && (
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-3 space-y-3">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className={`flex gap-3 p-3 rounded-lg border ${
                      card.status === 'error' ? 'border-destructive/50 bg-destructive/5' :
                      card.status === 'imported' ? 'border-gain/50 bg-gain/5' :
                      'border-border/50 bg-muted/30'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-20 rounded overflow-hidden bg-secondary/50 flex-shrink-0">
                      <img
                        src={card.previewUrl}
                        alt="Card"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {card.status === 'analyzing' ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing card...
                        </div>
                      ) : card.status === 'error' ? (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <XCircle className="w-4 h-4" />
                          {card.error || 'Analysis failed'}
                        </div>
                      ) : card.status === 'imported' ? (
                        <div className="flex items-center gap-2 text-sm text-gain">
                          <CheckCircle2 className="w-4 h-4" />
                          Imported: {card.title}
                        </div>
                      ) : editingCardId === card.id ? (
                        <div className="space-y-2">
                          <Input
                            value={card.title}
                            onChange={(e) => updateCard(card.id, { title: e.target.value })}
                            placeholder="Card name"
                            className="h-8 text-sm"
                          />
                          <div className="flex gap-2">
                            <Select
                              value={card.category}
                              onValueChange={(val) => updateCard(card.id, { category: val })}
                            >
                              <SelectTrigger className="h-8 text-xs w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map(cat => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={card.condition}
                              onValueChange={(val) => updateCard(card.id, { condition: val })}
                            >
                              <SelectTrigger className="h-8 text-xs w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CONDITIONS.map(cond => (
                                  <SelectItem key={cond} value={cond}>
                                    {cond}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={card.suggestedPrice || ''}
                              onChange={(e) => updateCard(card.id, { suggestedPrice: parseFloat(e.target.value) || 0 })}
                              placeholder="Price"
                              className="h-8 text-xs w-20"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={() => setEditingCardId(null)}
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{card.title || 'Unknown Card'}</span>
                            {card.confidence > 0.7 && (
                              <Badge variant="outline" className="text-xs bg-gain/10 text-gain border-gain/30">
                                {Math.round(card.confidence * 100)}% match
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">{card.category}</Badge>
                            <span>{card.condition}</span>
                            {card.suggestedPrice > 0 && (
                              <span className="font-medium text-foreground">
                                {formatPrice(card.suggestedPrice)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {card.status === 'detected' && editingCardId !== card.id && (
                      <div className="flex flex-col gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditingCardId(card.id)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeCard(card.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={importProgress} />
              <p className="text-sm text-muted-foreground text-center">
                Importing listings... {importProgress}%
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="ghost" onClick={resetState} disabled={isImporting}>
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={readyCount === 0 || isImporting || isAnalyzing}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${readyCount} Listings`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
