import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  RefreshCw, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Play,
  Loader2,
  Link,
  ExternalLink
} from "lucide-react";

interface SyncResult {
  success: boolean;
  processed?: number;
  normalized?: number;
  skipped?: number;
  matched?: number;
  unmatched?: number;
  errors?: string[];
  samples?: any[];
}

interface UnmatchedItem {
  id: string;
  source: string;
  external_id: string | null;
  raw_payload: any;
  reason: string;
  suggested_matches: any;
  created_at: string;
  resolved_at: string | null;
}

interface SetMapping {
  id: string;
  console_name: string;
  game: string;
  set_code: string;
  language: string;
}

export function CatalogOpsPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("normalize");
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [limit, setLimit] = useState<number>(100);
  const [dryRun, setDryRun] = useState(true);
  
  // Results state
  const [normalizeResult, setNormalizeResult] = useState<SyncResult | null>(null);
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedItem[]>([]);
  const [setMappings, setSetMappings] = useState<SetMapping[]>([]);
  const [stats, setStats] = useState({
    totalCatalog: 0,
    normalizedCount: 0,
    unmatchedCount: 0,
    priceEventsCount: 0,
  });

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
    fetchUnmatchedItems();
    fetchSetMappings();
  }, []);

  const fetchStats = async () => {
    const [catalogRes, unmatchedRes, pricesRes] = await Promise.all([
      supabase.from('catalog_cards').select('id', { count: 'exact', head: true }),
      supabase.from('pricing_unmatched_items').select('id', { count: 'exact', head: true }).is('resolved_at', null),
      supabase.from('card_prices').select('id', { count: 'exact', head: true }),
    ]);
    
    const normalizedRes = await supabase
      .from('market_items')
      .select('id', { count: 'exact', head: true })
      .not('normalized_key', 'is', null);
    
    setStats({
      totalCatalog: catalogRes.count || 0,
      normalizedCount: normalizedRes.count || 0,
      unmatchedCount: unmatchedRes.count || 0,
      priceEventsCount: pricesRes.count || 0,
    });
  };

  const fetchUnmatchedItems = async () => {
    const { data } = await supabase
      .from('pricing_unmatched_items')
      .select('*')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(50);
    
    setUnmatchedItems((data as UnmatchedItem[]) || []);
  };

  const fetchSetMappings = async () => {
    try {
      // Use raw query since table might not be in generated types yet
      const { data, error } = await (supabase as any)
        .from('pricecharting_set_map')
        .select('*')
        .order('console_name');
      
      if (error) {
        console.error('Error fetching set mappings:', error);
        return;
      }
      
      if (data) {
        setSetMappings(data.map((item: any) => ({
          id: item.id || item.console_name,
          console_name: item.console_name,
          game: item.game,
          set_code: item.set_code,
          language: item.language || 'EN',
        })));
      }
    } catch (err) {
      console.error('Failed to fetch set mappings:', err);
    }
  };

  const runNormalization = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('catalog-normalize', {
        body: {
          game: selectedGame === 'all' ? undefined : selectedGame,
          limit,
          dryRun,
          forceRecompute: false,
        }
      });
      
      if (error) throw error;
      
      setNormalizeResult(data);
      toast({
        title: dryRun ? "Dry Run Complete" : "Normalization Complete",
        description: `Processed ${data.processed} items, normalized ${data.normalized}`,
      });
      
      if (!dryRun) {
        fetchStats();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to run normalization",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runPriceChartingIngest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('catalog-ingest-pricecharting', {
        body: {
          game: selectedGame === 'all' ? 'pokemon' : selectedGame,
          limit,
          updatePrices: true,
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "PriceCharting Ingest Complete",
        description: `Matched ${data.matched} items, ${data.pricesUpdated} prices updated`,
      });
      
      fetchStats();
      fetchUnmatchedItems();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to run ingest",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runEbayIngest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('catalog-ingest-ebay', {
        body: {
          game: selectedGame === 'all' ? 'onepiece' : selectedGame,
          limit,
          type: 'sold',
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "eBay Ingest Complete",
        description: `Matched ${data.matched} listings, ${data.pricesRecorded} prices recorded`,
      });
      
      fetchStats();
      fetchUnmatchedItems();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to run eBay ingest",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveUnmatchedItem = async (item: UnmatchedItem, catalogCardId?: string) => {
    const { error } = await supabase
      .from('pricing_unmatched_items')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_to_catalog_id: catalogCardId || null,
      })
      .eq('id', item.id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Resolved", description: "Item marked as resolved" });
      fetchUnmatchedItems();
      fetchStats();
    }
  };

  const addSetMapping = async (consoleName: string, setCode: string, game: string = 'pokemon') => {
    const { error } = await supabase
      .from('pricecharting_set_map' as any)
      .insert({ console_name: consoleName, set_code: setCode, game });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Added", description: `Mapped "${consoleName}" → ${setCode}` });
      fetchSetMappings();
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Catalog Cards</p>
                <p className="text-2xl font-bold">{stats.totalCatalog.toLocaleString()}</p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Normalized Items</p>
                <p className="text-2xl font-bold">{stats.normalizedCount.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unmatched Queue</p>
                <p className="text-2xl font-bold">{stats.unmatchedCount.toLocaleString()}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Price Events</p>
                <p className="text-2xl font-bold">{stats.priceEventsCount.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="normalize">Normalize</TabsTrigger>
          <TabsTrigger value="ingest">Price Ingest</TabsTrigger>
          <TabsTrigger value="unmatched">Unmatched Queue ({stats.unmatchedCount})</TabsTrigger>
          <TabsTrigger value="set-mappings">Set Mappings</TabsTrigger>
        </TabsList>

        <TabsContent value="normalize" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Card Normalization</CardTitle>
              <CardDescription>
                Normalize card numbers and build canonical keys for matching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Game</label>
                  <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Games</SelectItem>
                      <SelectItem value="pokemon">Pokemon</SelectItem>
                      <SelectItem value="onepiece">One Piece</SelectItem>
                      <SelectItem value="yugioh">Yu-Gi-Oh</SelectItem>
                      <SelectItem value="mtg">Magic: The Gathering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Limit</label>
                  <Input 
                    type="number" 
                    value={limit} 
                    onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                    className="w-[100px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dryRun"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="dryRun" className="text-sm">Dry Run</label>
                </div>
                <Button onClick={runNormalization} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  Run Normalization
                </Button>
              </div>

              {normalizeResult && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex gap-4">
                    <Badge variant={normalizeResult.success ? "default" : "destructive"}>
                      {normalizeResult.success ? "Success" : "Failed"}
                    </Badge>
                    <span>Processed: {normalizeResult.processed}</span>
                    <span>Normalized: {normalizeResult.normalized}</span>
                    <span>Skipped: {normalizeResult.skipped}</span>
                  </div>
                  
                  {normalizeResult.samples && normalizeResult.samples.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Sample Results:</h4>
                      <ScrollArea className="h-[200px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Original</TableHead>
                              <TableHead>Normalized</TableHead>
                              <TableHead>Canonical Key</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {normalizeResult.samples.map((sample, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{sample.name?.slice(0, 30)}...</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {sample.original?.set_code}-{sample.original?.card_number}
                                </TableCell>
                                <TableCell className="text-green-600">
                                  {sample.normalized?.set_code}-{sample.normalized?.card_number}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {sample.normalized?.canonical_key}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingest" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>PriceCharting</CardTitle>
                <CardDescription>Ingest prices from PriceCharting API</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-end">
                  <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pokemon">Pokemon</SelectItem>
                      <SelectItem value="onepiece">One Piece</SelectItem>
                      <SelectItem value="yugioh">Yu-Gi-Oh</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    value={limit} 
                    onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                    className="w-[80px]"
                  />
                  <Button onClick={runPriceChartingIngest} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>eBay Sold Listings</CardTitle>
                <CardDescription>Ingest sale comps from eBay</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-end">
                  <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onepiece">One Piece</SelectItem>
                      <SelectItem value="pokemon">Pokemon</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    value={limit} 
                    onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                    className="w-[80px]"
                  />
                  <Button onClick={runEbayIngest} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="unmatched">
          <Card>
            <CardHeader>
              <CardTitle>Unmatched Price Events</CardTitle>
              <CardDescription>Review and resolve items that couldn't be auto-matched</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Suggestions</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmatchedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline">{item.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="font-medium truncate">
                              {item.raw_payload?.title || item.raw_payload?.search_query || 'Unknown'}
                            </p>
                            {item.raw_payload?.price && (
                              <p className="text-sm text-muted-foreground">
                                ${item.raw_payload.price}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                          {item.reason}
                        </TableCell>
                        <TableCell>
                          {item.suggested_matches?.length > 0 && (
                            <div className="space-y-1">
                              {item.suggested_matches.slice(0, 2).map((match: any, i: number) => (
                                <Button
                                  key={i}
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto py-1 text-xs"
                                  onClick={() => resolveUnmatchedItem(item, match.id)}
                                >
                                  <Link className="h-3 w-3 mr-1" />
                                  {match.name?.slice(0, 25)}...
                                </Button>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resolveUnmatchedItem(item)}
                          >
                            Dismiss
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="set-mappings">
          <Card>
            <CardHeader>
              <CardTitle>PriceCharting Set Mappings</CardTitle>
              <CardDescription>Map PriceCharting console names to canonical set codes</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Console Name (PriceCharting)</TableHead>
                      <TableHead>Set Code</TableHead>
                      <TableHead>Game</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {setMappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell>{mapping.console_name}</TableCell>
                        <TableCell>
                          <Badge>{mapping.set_code}</Badge>
                        </TableCell>
                        <TableCell>{mapping.game}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}