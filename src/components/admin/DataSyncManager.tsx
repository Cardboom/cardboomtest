import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Image as ImageIcon, 
  Database, 
  Play, 
  Pause,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

interface SyncStats {
  total: number;
  withImages: number;
  missingImages: number;
  byCategory: Record<string, { total: number; withImages: number }>;
}

export const DataSyncManager = () => {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({});
  const [syncResults, setSyncResults] = useState<Record<string, { updated: number; errors: number }>>({});
  
  // Sync settings
  const [batchSize, setBatchSize] = useState(50);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [delayMs, setDelayMs] = useState(200);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Get overall stats
      const { data: allItems } = await supabase
        .from('market_items')
        .select('category, image_url');

      if (allItems) {
        const byCategory: Record<string, { total: number; withImages: number }> = {};
        let totalWithImages = 0;

        allItems.forEach(item => {
          if (!byCategory[item.category]) {
            byCategory[item.category] = { total: 0, withImages: 0 };
          }
          byCategory[item.category].total++;
          
          const hasImage = item.image_url && 
            !item.image_url.includes('placeholder') && 
            item.image_url !== '';
          
          if (hasImage) {
            byCategory[item.category].withImages++;
            totalWithImages++;
          }
        });

        setStats({
          total: allItems.length,
          withImages: totalWithImages,
          missingImages: allItems.length - totalWithImages,
          byCategory
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const triggerSync = async (source: string) => {
    setIsSyncing(prev => ({ ...prev, [source]: true }));
    
    try {
      const functionName = source === 'cardmarket' 
        ? 'sync-cardmarket-images'
        : source === 'tcgdex'
        ? 'sync-tcgdex-images'
        : source === 'scryfall'
        ? 'sync-scryfall-images'
        : source === 'ygopro'
        ? 'sync-ygopro-images'
        : 'sync-pricecharting-listings';

      const body: Record<string, unknown> = { limit: batchSize };
      
      if (source === 'cardmarket') {
        body.delay_ms = delayMs;
        body.store_price_history = true;
        if (selectedCategory !== 'all') {
          body.category = selectedCategory;
        }
      } else if (selectedCategory !== 'all') {
        body.category = selectedCategory;
      }

      const { data, error } = await supabase.functions.invoke(functionName, { body });
      
      if (error) throw error;

      setSyncResults(prev => ({
        ...prev,
        [source]: {
          updated: data?.updated || data?.images_added || 0,
          errors: data?.errors || 0
        }
      }));

      toast.success(`${source}: Synced ${data?.updated || 0} items`);
      fetchStats();
    } catch (error) {
      console.error(`Error syncing ${source}:`, error);
      toast.error(`Failed to sync from ${source}`);
      setSyncResults(prev => ({
        ...prev,
        [source]: { updated: 0, errors: 1 }
      }));
    } finally {
      setIsSyncing(prev => ({ ...prev, [source]: false }));
    }
  };

  const sources = [
    { id: 'cardmarket', name: 'Cardmarket API', description: 'Premium - 3000/day, 300/min', color: 'bg-blue-500', categories: ['pokemon', 'yugioh', 'mtg', 'onepiece', 'lorcana'] },
    { id: 'tcgdex', name: 'TCGdex', description: 'Free - Pokemon only', color: 'bg-yellow-500', categories: ['pokemon'] },
    { id: 'scryfall', name: 'Scryfall', description: 'Free - MTG only', color: 'bg-orange-500', categories: ['mtg'] },
    { id: 'ygopro', name: 'YGOPro', description: 'Free - Yu-Gi-Oh only', color: 'bg-purple-500', categories: ['yugioh'] },
    { id: 'pricecharting', name: 'PriceCharting', description: 'Prices & some images', color: 'bg-green-500', categories: ['all'] },
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'pokemon', label: 'Pokemon' },
    { value: 'yugioh', label: 'Yu-Gi-Oh' },
    { value: 'mtg', label: 'Magic: The Gathering' },
    { value: 'onepiece', label: 'One Piece' },
    { value: 'lorcana', label: 'Disney Lorcana' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const imageProgress = stats ? (stats.withImages / stats.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{stats?.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">With Images</p>
                <p className="text-2xl font-bold text-emerald-500">{stats?.withImages.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Missing Images</p>
                <p className="text-2xl font-bold text-amber-500">{stats?.missingImages.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Image Coverage</span>
            <span className="text-sm text-muted-foreground">{imageProgress.toFixed(1)}%</span>
          </div>
          <Progress value={imageProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats?.byCategory && Object.entries(stats.byCategory).map(([category, data]) => {
              const progress = (data.withImages / data.total) * 100;
              return (
                <div key={category} className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">{category}</span>
                    <Badge variant="outline" className="text-xs">
                      {data.withImages}/{data.total}
                    </Badge>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Sync Settings
          </CardTitle>
          <CardDescription>Configure batch sync parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Batch Size</Label>
              <Input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                min={10}
                max={200}
              />
              <p className="text-xs text-muted-foreground">Items per sync (10-200)</p>
            </div>

            <div className="space-y-2">
              <Label>Category Filter</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API Delay (ms)</Label>
              <Input
                type="number"
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                min={100}
                max={5000}
                step={100}
              />
              <p className="text-xs text-muted-foreground">200ms = 300 req/min</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Data Sources
          </CardTitle>
          <CardDescription>Click to sync images from each source</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {sources.map(source => {
              const isSourceSyncing = isSyncing[source.id];
              const result = syncResults[source.id];
              
              return (
                <div 
                  key={source.id} 
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${source.color}`} />
                    <div>
                      <p className="font-medium">{source.name}</p>
                      <p className="text-xs text-muted-foreground">{source.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {result && (
                      <div className="text-xs text-right">
                        <span className="text-emerald-500">{result.updated} updated</span>
                        {result.errors > 0 && (
                          <span className="text-destructive ml-2">{result.errors} errors</span>
                        )}
                      </div>
                    )}
                    
                    <Button
                      size="sm"
                      variant={isSourceSyncing ? "secondary" : "default"}
                      onClick={() => triggerSync(source.id)}
                      disabled={isSourceSyncing}
                      className="min-w-[100px]"
                    >
                      {isSourceSyncing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Sync
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={fetchStats}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Stats
          </Button>
          
          <Button 
            variant="default"
            onClick={async () => {
              // Sync all free sources
              await Promise.all([
                triggerSync('tcgdex'),
                triggerSync('scryfall'),
                triggerSync('ygopro'),
              ]);
            }}
            disabled={Object.values(isSyncing).some(Boolean)}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Sync All Free Sources
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
