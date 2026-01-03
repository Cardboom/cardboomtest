import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Package, Key, RefreshCw, Upload, Settings, Zap, TrendingUp } from 'lucide-react';

interface ProviderConfig {
  id: string;
  provider: string;
  is_enabled: boolean;
  markup_percent: number;
  auto_purchase_enabled: boolean;
  min_stock_threshold: number;
  last_sync_at: string | null;
}

interface DigitalCode {
  id: string;
  product_name: string;
  product_type: string;
  game_name: string;
  code: string;
  is_sold: boolean;
  source_provider: string;
  cost_price_cents: number;
  created_at: string;
}

export const DigitalProductsManager = () => {
  const queryClient = useQueryClient();
  const [newCode, setNewCode] = useState({
    product_name: '',
    product_type: 'game_points',
    game_name: '',
    code: '',
    market_item_id: '',
  });
  const [bulkCodes, setBulkCodes] = useState('');
  const [selectedMarketItem, setSelectedMarketItem] = useState('');

  // Fetch provider configs
  const { data: providers, isLoading: loadingProviders } = useQuery({
    queryKey: ['provider-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('key_provider_config')
        .select('*')
        .order('provider');
      if (error) throw error;
      return data as ProviderConfig[];
    },
  });

  // Fetch digital codes
  const { data: codes, isLoading: loadingCodes } = useQuery({
    queryKey: ['digital-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('digital_product_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as DigitalCode[];
    },
  });

  // Fetch market items for linking
  const { data: marketItems } = useQuery({
    queryKey: ['gaming-market-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_items')
        .select('id, name, category, subcategory')
        .in('category', ['gamepoints', 'gaming'])
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Update provider config
  const updateProvider = useMutation({
    mutationFn: async (update: { id: string; field: string; value: any }) => {
      const { error } = await supabase
        .from('key_provider_config')
        .update({ [update.field]: update.value })
        .eq('id', update.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-configs'] });
      toast.success('Provider updated');
    },
    onError: (error) => {
      toast.error('Failed to update provider');
      console.error(error);
    },
  });

  // Add single code
  const addCode = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('digital_product_codes')
        .insert({
          ...newCode,
          market_item_id: newCode.market_item_id || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-codes'] });
      setNewCode({
        product_name: '',
        product_type: 'game_points',
        game_name: '',
        code: '',
        market_item_id: '',
      });
      toast.success('Code added');
    },
    onError: (error) => {
      toast.error('Failed to add code');
      console.error(error);
    },
  });

  // Bulk add codes
  const bulkAddCodes = useMutation({
    mutationFn: async () => {
      const lines = bulkCodes.split('\n').filter(line => line.trim());
      const codes = lines.map(code => ({
        product_name: newCode.product_name,
        product_type: newCode.product_type,
        game_name: newCode.game_name,
        code: code.trim(),
        market_item_id: selectedMarketItem || null,
      }));
      
      const { error } = await supabase
        .from('digital_product_codes')
        .insert(codes);
      if (error) throw error;
      return codes.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['digital-codes'] });
      setBulkCodes('');
      toast.success(`Added ${count} codes`);
    },
    onError: (error) => {
      toast.error('Failed to add codes');
      console.error(error);
    },
  });

  // Sync from provider
  const syncProvider = useMutation({
    mutationFn: async (provider: string) => {
      const { data, error } = await supabase.functions.invoke('digital-fulfillment', {
        body: { action: 'sync_products', provider },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['provider-configs'] });
      queryClient.invalidateQueries({ queryKey: ['gaming-market-items'] });
      toast.success(`Synced ${data.synced} products`);
    },
    onError: (error) => {
      toast.error('Sync failed');
      console.error(error);
    },
  });

  const availableCodes = codes?.filter(c => !c.is_sold).length || 0;
  const soldCodes = codes?.filter(c => c.is_sold).length || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Package className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{availableCodes}</p>
                <p className="text-sm text-muted-foreground">Available Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Key className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{soldCodes}</p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">15%</p>
                <p className="text-sm text-muted-foreground">Markup</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold/20 rounded-lg">
                <Zap className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {providers?.filter(p => p.auto_purchase_enabled).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Auto-Buy Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="codes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="codes">Code Inventory</TabsTrigger>
          <TabsTrigger value="add">Add Codes</TabsTrigger>
          <TabsTrigger value="providers">Provider Config</TabsTrigger>
        </TabsList>

        {/* Code Inventory */}
        <TabsContent value="codes">
          <Card>
            <CardHeader>
              <CardTitle>Digital Code Inventory</CardTitle>
              <CardDescription>Manage game keys and points codes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes?.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-medium">{code.product_name}</TableCell>
                      <TableCell>{code.game_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{code.product_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {code.is_sold ? '••••••••' : code.code.substring(0, 8) + '...'}
                      </TableCell>
                      <TableCell>{code.source_provider}</TableCell>
                      <TableCell>
                        <Badge variant={code.is_sold ? 'default' : 'outline'}>
                          {code.is_sold ? 'Sold' : 'Available'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add Codes */}
        <TabsContent value="add">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Single Code */}
            <Card>
              <CardHeader>
                <CardTitle>Add Single Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={newCode.product_name}
                    onChange={(e) => setNewCode({ ...newCode, product_name: e.target.value })}
                    placeholder="e.g., Valorant Points - 1000 VP"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Game Name</Label>
                  <Input
                    value={newCode.game_name}
                    onChange={(e) => setNewCode({ ...newCode, game_name: e.target.value })}
                    placeholder="e.g., Valorant"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Product Type</Label>
                  <Select
                    value={newCode.product_type}
                    onValueChange={(v) => setNewCode({ ...newCode, product_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="game_key">Game Key</SelectItem>
                      <SelectItem value="game_points">Game Points</SelectItem>
                      <SelectItem value="gift_card">Gift Card</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Link to Market Item (Optional)</Label>
                  <Select
                    value={newCode.market_item_id}
                    onValueChange={(v) => setNewCode({ ...newCode, market_item_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {marketItems?.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    value={newCode.code}
                    onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                    placeholder="Enter the redemption code"
                    className="font-mono"
                  />
                </div>
                
                <Button 
                  onClick={() => addCode.mutate()} 
                  disabled={!newCode.code || !newCode.product_name}
                  className="w-full"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Add Code
                </Button>
              </CardContent>
            </Card>

            {/* Bulk Codes */}
            <Card>
              <CardHeader>
                <CardTitle>Bulk Import Codes</CardTitle>
                <CardDescription>One code per line</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={newCode.product_name}
                    onChange={(e) => setNewCode({ ...newCode, product_name: e.target.value })}
                    placeholder="e.g., PUBG Mobile UC - 660 UC"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Game Name</Label>
                    <Input
                      value={newCode.game_name}
                      onChange={(e) => setNewCode({ ...newCode, game_name: e.target.value })}
                      placeholder="e.g., PUBG Mobile"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Link to Market Item</Label>
                    <Select
                      value={selectedMarketItem}
                      onValueChange={setSelectedMarketItem}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {marketItems?.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Codes (one per line)</Label>
                  <Textarea
                    value={bulkCodes}
                    onChange={(e) => setBulkCodes(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY&#10;ZZZZ-ZZZZ-ZZZZ"
                    className="font-mono min-h-[200px]"
                  />
                </div>
                
                <Button 
                  onClick={() => bulkAddCodes.mutate()} 
                  disabled={!bulkCodes || !newCode.product_name}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import {bulkCodes.split('\n').filter(l => l.trim()).length} Codes
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Provider Config */}
        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Key Reseller Providers
              </CardTitle>
              <CardDescription>
                Configure auto-purchase from key reseller APIs with 15% markup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Markup %</TableHead>
                    <TableHead>Auto-Purchase</TableHead>
                    <TableHead>Min Stock</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers?.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium capitalize">
                        {provider.provider}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={provider.is_enabled}
                          onCheckedChange={(checked) =>
                            updateProvider.mutate({
                              id: provider.id,
                              field: 'is_enabled',
                              value: checked,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={provider.markup_percent}
                          onChange={(e) =>
                            updateProvider.mutate({
                              id: provider.id,
                              field: 'markup_percent',
                              value: parseFloat(e.target.value),
                            })
                          }
                          className="w-20"
                          min="0"
                          max="100"
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={provider.auto_purchase_enabled}
                          onCheckedChange={(checked) =>
                            updateProvider.mutate({
                              id: provider.id,
                              field: 'auto_purchase_enabled',
                              value: checked,
                            })
                          }
                          disabled={provider.provider === 'manual'}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={provider.min_stock_threshold}
                          onChange={(e) =>
                            updateProvider.mutate({
                              id: provider.id,
                              field: 'min_stock_threshold',
                              value: parseInt(e.target.value),
                            })
                          }
                          className="w-20"
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {provider.last_sync_at
                          ? new Date(provider.last_sync_at).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncProvider.mutate(provider.provider)}
                          disabled={!provider.is_enabled || provider.provider === 'manual'}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> To enable Kinguin, G2A, or Eneba integration, add the corresponding API key 
                  (KINGUIN_API_KEY, G2A_API_KEY, ENEBA_API_KEY) in your backend secrets.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
