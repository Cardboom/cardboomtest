import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Database, Play, Zap, CheckCircle, AlertCircle, Crown, Rocket } from 'lucide-react';

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
  
  const [batchSize, setBatchSize] = useState(100);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [delayMs, setDelayMs] = useState(200);
  const [totalBatches, setTotalBatches] = useState(10);
  const [isRunningBulkSync, setIsRunningBulkSync] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data: allItems } = await supabase.from('market_items').select('category, image_url');
      if (allItems) {
        const byCategory: Record<string, { total: number; withImages: number }> = {};
        let totalWithImages = 0;
        allItems.forEach(item => {
          if (!byCategory[item.category]) byCategory[item.category] = { total: 0, withImages: 0 };
          byCategory[item.category].total++;
          if (item.image_url && !item.image_url.includes('placeholder') && !item.image_url.startsWith('data:') && item.image_url !== '') {
            byCategory[item.category].withImages++;
            totalWithImages++;
          }
        });
        setStats({ total: allItems.length, withImages: totalWithImages, missingImages: allItems.length - totalWithImages, byCategory });
      }
    } catch (error) { console.error('Error:', error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const triggerSync = async (source: string) => {
    setIsSyncing(prev => ({ ...prev, [source]: true }));
    try {
      const functionName = source === 'cardmarket' ? 'sync-cardmarket-images' : source === 'tcgdex' ? 'sync-tcgdex-images' : source === 'scryfall' ? 'sync-scryfall-images' : source === 'ygopro' ? 'sync-ygopro-images' : source === 'optcg' ? 'sync-optcg-images' : 'sync-pricecharting-listings';
      const body: Record<string, unknown> = { limit: batchSize };
      if (source === 'cardmarket') { body.delay_ms = delayMs; body.store_price_history = true; if (selectedCategory !== 'all') body.category = selectedCategory; }
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      if (error) throw error;
      setSyncResults(prev => ({ ...prev, [source]: { updated: data?.updated || 0, errors: data?.errors || 0 } }));
      toast.success(`${source}: Synced ${data?.updated || 0} items`);
      fetchStats();
    } catch (error) { toast.error(`Failed to sync ${source}`); }
    finally { setIsSyncing(prev => ({ ...prev, [source]: false })); }
  };

  const runBulkCardmarketSync = async () => {
    setIsRunningBulkSync(true);
    let totalUpdated = 0, offset = 0;
    try {
      for (let batch = 0; batch < totalBatches; batch++) {
        const body: Record<string, unknown> = { limit: batchSize, offset, delay_ms: delayMs, store_price_history: true };
        if (selectedCategory !== 'all') body.category = selectedCategory;
        const { data } = await supabase.functions.invoke('sync-cardmarket-images', { body });
        totalUpdated += data?.updated || 0;
        offset += batchSize;
        if (batch < totalBatches - 1) await new Promise(r => setTimeout(r, 2000));
      }
      toast.success(`Cardmarket bulk sync: ${totalUpdated} items`);
      fetchStats();
    } catch (error) { toast.error('Bulk sync failed'); }
    finally { setIsRunningBulkSync(false); }
  };

  const sources = [
    { id: 'cardmarket', name: 'Cardmarket API', description: 'PREMIUM - 3000/day', color: 'bg-blue-500', isPaid: true },
    { id: 'tcgdex', name: 'TCGdex', description: 'Free - Pokemon', color: 'bg-yellow-500', isPaid: false },
    { id: 'scryfall', name: 'Scryfall', description: 'Free - MTG', color: 'bg-orange-500', isPaid: false },
    { id: 'ygopro', name: 'YGOPro', description: 'Free - Yu-Gi-Oh', color: 'bg-purple-500', isPaid: false },
    { id: 'optcg', name: 'OPTCG', description: 'Free - One Piece', color: 'bg-red-500', isPaid: false },
  ];

  if (isLoading) return <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

  const imageProgress = stats ? (stats.withImages / stats.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50"><CardContent className="p-4 flex items-center gap-3"><Database className="w-5 h-5 text-primary" /><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats?.total.toLocaleString()}</p></div></CardContent></Card>
        <Card className="bg-card/50"><CardContent className="p-4 flex items-center gap-3"><CheckCircle className="w-5 h-5 text-emerald-500" /><div><p className="text-sm text-muted-foreground">With Images</p><p className="text-2xl font-bold text-emerald-500">{stats?.withImages.toLocaleString()}</p></div></CardContent></Card>
        <Card className="bg-card/50"><CardContent className="p-4 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-amber-500" /><div><p className="text-sm text-muted-foreground">Missing</p><p className="text-2xl font-bold text-amber-500">{stats?.missingImages.toLocaleString()}</p></div></CardContent></Card>
      </div>

      <Card><CardContent className="p-4"><div className="flex justify-between mb-2"><span className="text-sm font-medium">Coverage</span><span className="text-sm text-muted-foreground">{imageProgress.toFixed(1)}%</span></div><Progress value={imageProgress} className="h-3" /></CardContent></Card>

      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
        <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-gold" />Premium API Maximizer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><Label>Batch Size</Label><Input type="number" value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} min={10} max={200} /></div>
            <div><Label>Batches</Label><Input type="number" value={totalBatches} onChange={e => setTotalBatches(Number(e.target.value))} min={1} max={30} /></div>
            <div><Label>Category</Label><Select value={selectedCategory} onValueChange={setSelectedCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pokemon">Pokemon</SelectItem><SelectItem value="yugioh">Yu-Gi-Oh</SelectItem><SelectItem value="mtg">MTG</SelectItem></SelectContent></Select></div>
            <div><Label>Delay (ms)</Label><Input type="number" value={delayMs} onChange={e => setDelayMs(Number(e.target.value))} min={100} /></div>
          </div>
          <div className="flex gap-3">
            <Button onClick={runBulkCardmarketSync} disabled={isRunningBulkSync} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {isRunningBulkSync ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
              Bulk Cardmarket ({batchSize * totalBatches} items)
            </Button>
            <Button variant="outline" onClick={() => Promise.all(['tcgdex', 'scryfall', 'ygopro', 'optcg'].map(triggerSync))} disabled={isRunningBulkSync}><Rocket className="w-4 h-4 mr-2" />All Free Sources</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Data Sources</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {sources.map(source => (
            <div key={source.id} className={`flex items-center justify-between p-4 rounded-lg border ${source.isPaid ? 'bg-blue-500/5 border-blue-500/30' : 'bg-muted/30'}`}>
              <div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${source.color}`} /><div><p className="font-medium">{source.name} {source.isPaid && <Crown className="w-4 h-4 inline text-gold" />}</p><p className="text-xs text-muted-foreground">{source.description}</p></div></div>
              <div className="flex items-center gap-3">
                {syncResults[source.id] && <span className="text-xs text-emerald-500">{syncResults[source.id].updated} updated</span>}
                <Button size="sm" onClick={() => triggerSync(source.id)} disabled={isSyncing[source.id]}>{isSyncing[source.id] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
