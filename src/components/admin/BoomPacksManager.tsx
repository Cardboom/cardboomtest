import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Sparkles,
  Box,
  Star,
  Archive
} from 'lucide-react';

interface BoomPackType {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_gems: number;
  cards_count: number;
  category: string;
  rarity_distribution: unknown;
  is_active: boolean;
  is_featured: boolean;
  stock_limit: number | null;
  stock_sold: number;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  updated_at: string;
}

interface InventoryPoolItem {
  id: string;
  card_name: string;
  card_image_url: string | null;
  category: string;
  rarity: string;
  utility_value_gems: number;
  is_available: boolean;
  allocated_to_pack_id: string | null;
}

const CATEGORIES = ['pokemon', 'one-piece', 'mtg', 'yugioh', 'lorcana', 'sports', 'mixed'];
const RARITIES = ['common', 'uncommon', 'rare', 'ultra_rare', 'legendary'];

export const BoomPacksManager: React.FC = () => {
  const [packTypes, setPackTypes] = useState<BoomPackType[]>([]);
  const [inventoryPool, setInventoryPool] = useState<InventoryPoolItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'types' | 'inventory'>('types');
  
  // Pack Type Form
  const [isCreating, setIsCreating] = useState(false);
  const [editingPack, setEditingPack] = useState<BoomPackType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    price_gems: 100,
    cards_count: 5,
    category: 'pokemon',
    is_active: true,
    is_featured: false,
    stock_limit: '',
  });

  // Inventory Form
  const [isAddingInventory, setIsAddingInventory] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({
    card_name: '',
    card_image_url: '',
    category: 'pokemon',
    rarity: 'common',
    utility_value_gems: 100,
  });

  useEffect(() => {
    fetchPackTypes();
    fetchInventoryPool();
  }, []);

  const fetchPackTypes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('boom_pack_types')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load pack types');
      console.error(error);
    } else {
      setPackTypes(data || []);
    }
    setIsLoading(false);
  };

  const fetchInventoryPool = async () => {
    const { data, error } = await supabase
      .from('boom_pack_inventory_pool')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
    } else {
      setInventoryPool(data || []);
    }
  };

  const handleCreatePackType = async () => {
    const { error } = await supabase.from('boom_pack_types').insert({
      name: formData.name,
      description: formData.description || null,
      image_url: formData.image_url || null,
      price_gems: formData.price_gems,
      cards_count: formData.cards_count,
      category: formData.category,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      stock_limit: formData.stock_limit ? parseInt(formData.stock_limit) : null,
    });

    if (error) {
      toast.error('Failed to create pack type');
      console.error(error);
    } else {
      toast.success('Pack type created');
      setIsCreating(false);
      resetForm();
      fetchPackTypes();
    }
  };

  const handleUpdatePackType = async () => {
    if (!editingPack) return;

    const { error } = await supabase
      .from('boom_pack_types')
      .update({
        name: formData.name,
        description: formData.description || null,
        image_url: formData.image_url || null,
        price_gems: formData.price_gems,
        cards_count: formData.cards_count,
        category: formData.category,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        stock_limit: formData.stock_limit ? parseInt(formData.stock_limit) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingPack.id);

    if (error) {
      toast.error('Failed to update pack type');
      console.error(error);
    } else {
      toast.success('Pack type updated');
      setEditingPack(null);
      resetForm();
      fetchPackTypes();
    }
  };

  const handleDeletePackType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pack type?')) return;

    const { error } = await supabase.from('boom_pack_types').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete pack type');
      console.error(error);
    } else {
      toast.success('Pack type deleted');
      fetchPackTypes();
    }
  };

  const handleAddInventory = async () => {
    const { error } = await supabase.from('boom_pack_inventory_pool').insert({
      card_name: inventoryForm.card_name,
      card_image_url: inventoryForm.card_image_url || null,
      category: inventoryForm.category,
      rarity: inventoryForm.rarity,
      utility_value_gems: inventoryForm.utility_value_gems,
      is_available: true,
    });

    if (error) {
      toast.error('Failed to add inventory item');
      console.error(error);
    } else {
      toast.success('Inventory item added');
      setIsAddingInventory(false);
      setInventoryForm({
        card_name: '',
        card_image_url: '',
        category: 'pokemon',
        rarity: 'common',
        utility_value_gems: 100,
      });
      fetchInventoryPool();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      price_gems: 100,
      cards_count: 5,
      category: 'pokemon',
      is_active: true,
      is_featured: false,
      stock_limit: '',
    });
  };

  const openEditDialog = (pack: BoomPackType) => {
    setEditingPack(pack);
    setFormData({
      name: pack.name,
      description: pack.description || '',
      image_url: pack.image_url || '',
      price_gems: pack.price_gems,
      cards_count: pack.cards_count,
      category: pack.category,
      is_active: pack.is_active,
      is_featured: pack.is_featured,
      stock_limit: pack.stock_limit?.toString() || '',
    });
  };

  const inventoryStats = {
    total: inventoryPool.length,
    available: inventoryPool.filter(i => i.is_available).length,
    allocated: inventoryPool.filter(i => !i.is_available).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Boom Packs Manager
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure pack types and manage inventory pool
          </p>
        </div>
        <Button onClick={() => { fetchPackTypes(); fetchInventoryPool(); }} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button 
          variant={activeTab === 'types' ? 'default' : 'outline'} 
          onClick={() => setActiveTab('types')}
        >
          <Box className="w-4 h-4 mr-2" />
          Pack Types
        </Button>
        <Button 
          variant={activeTab === 'inventory' ? 'default' : 'outline'} 
          onClick={() => setActiveTab('inventory')}
        >
          <Archive className="w-4 h-4 mr-2" />
          Inventory Pool ({inventoryStats.available} available)
        </Button>
      </div>

      {activeTab === 'types' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Pack Types</p>
                <p className="text-2xl font-bold">{packTypes.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-500">
                  {packTypes.filter(p => p.is_active).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Featured</p>
                <p className="text-2xl font-bold text-amber-500">
                  {packTypes.filter(p => p.is_featured).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Sold</p>
                <p className="text-2xl font-bold text-primary">
                  {packTypes.reduce((sum, p) => sum + p.stock_sold, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Create Button */}
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Pack Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Pack Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Pokémon Starter Pack"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Pack description..."
                  />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input 
                    value={formData.image_url} 
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price (Gems)</Label>
                    <Input 
                      type="number"
                      value={formData.price_gems} 
                      onChange={(e) => setFormData({ ...formData, price_gems: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Cards Count</Label>
                    <Input 
                      type="number"
                      value={formData.cards_count} 
                      onChange={(e) => setFormData({ ...formData, cards_count: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Stock Limit (optional)</Label>
                    <Input 
                      type="number"
                      value={formData.stock_limit} 
                      onChange={(e) => setFormData({ ...formData, stock_limit: e.target.value })}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={formData.is_active} 
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                    <Label>Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={formData.is_featured} 
                      onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })}
                    />
                    <Label>Featured</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button onClick={handleCreatePackType} disabled={!formData.name || formData.price_gems <= 0}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={!!editingPack} onOpenChange={(open) => !open && setEditingPack(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Pack Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input 
                    value={formData.image_url} 
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price (Gems)</Label>
                    <Input 
                      type="number"
                      value={formData.price_gems} 
                      onChange={(e) => setFormData({ ...formData, price_gems: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Cards Count</Label>
                    <Input 
                      type="number"
                      value={formData.cards_count} 
                      onChange={(e) => setFormData({ ...formData, cards_count: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Stock Limit</Label>
                    <Input 
                      type="number"
                      value={formData.stock_limit} 
                      onChange={(e) => setFormData({ ...formData, stock_limit: e.target.value })}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={formData.is_active} 
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                    <Label>Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={formData.is_featured} 
                      onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })}
                    />
                    <Label>Featured</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingPack(null)}>Cancel</Button>
                <Button onClick={handleUpdatePackType}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Pack Types Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pack</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Price</TableHead>
                    <TableHead className="text-center">Cards</TableHead>
                    <TableHead className="text-center">Sold</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : packTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No pack types created yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    packTypes.map((pack) => (
                      <TableRow key={pack.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {pack.image_url ? (
                              <img src={pack.image_url} alt={pack.name} className="w-10 h-10 rounded object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{pack.name}</p>
                              {pack.is_featured && (
                                <Badge className="bg-amber-500 text-[10px]">
                                  <Star className="w-3 h-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{pack.category}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-primary">{pack.price_gems}</span>
                          <span className="text-xs text-muted-foreground ml-1">💣</span>
                        </TableCell>
                        <TableCell className="text-center">{pack.cards_count}</TableCell>
                        <TableCell className="text-center">
                          {pack.stock_sold}
                          {pack.stock_limit && (
                            <span className="text-muted-foreground">/{pack.stock_limit}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {pack.is_active ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(pack)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePackType(pack.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'inventory' && (
        <>
          {/* Inventory Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{inventoryStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-500">{inventoryStats.available}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Allocated</p>
                <p className="text-2xl font-bold text-amber-500">{inventoryStats.allocated}</p>
              </CardContent>
            </Card>
          </div>

          {/* Add Inventory */}
          <Dialog open={isAddingInventory} onOpenChange={setIsAddingInventory}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Inventory Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Inventory Pool</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Card Name</Label>
                  <Input 
                    value={inventoryForm.card_name} 
                    onChange={(e) => setInventoryForm({ ...inventoryForm, card_name: e.target.value })}
                    placeholder="e.g., Charizard VMAX"
                  />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input 
                    value={inventoryForm.card_image_url} 
                    onChange={(e) => setInventoryForm({ ...inventoryForm, card_image_url: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={inventoryForm.category} onValueChange={(v) => setInventoryForm({ ...inventoryForm, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rarity</Label>
                    <Select value={inventoryForm.rarity} onValueChange={(v) => setInventoryForm({ ...inventoryForm, rarity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RARITIES.map(r => (
                          <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Utility Value (Gems)</Label>
                  <Input 
                    type="number"
                    value={inventoryForm.utility_value_gems} 
                    onChange={(e) => setInventoryForm({ ...inventoryForm, utility_value_gems: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingInventory(false)}>Cancel</Button>
                <Button onClick={handleAddInventory} disabled={!inventoryForm.card_name}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Inventory Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Rarity</TableHead>
                    <TableHead className="text-center">Value</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryPool.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No inventory items
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventoryPool.slice(0, 50).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.card_image_url ? (
                              <img src={item.card_image_url} alt={item.card_name} className="w-10 h-10 rounded object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium">{item.card_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              item.rarity === 'legendary' ? 'bg-purple-500' :
                              item.rarity === 'ultra_rare' ? 'bg-amber-500' :
                              item.rarity === 'rare' ? 'bg-blue-500' :
                              'bg-gray-500'
                            }
                          >
                            {item.rarity.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.utility_value_gems} 💣
                        </TableCell>
                        <TableCell className="text-center">
                          {item.is_available ? (
                            <Badge className="bg-green-500">Available</Badge>
                          ) : (
                            <Badge variant="secondary">Allocated</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
