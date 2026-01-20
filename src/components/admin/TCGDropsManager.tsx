import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Calendar, Edit, Check, X, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TCGDrop {
  id: string;
  name: string;
  tcg: string;
  release_date: string;
  type: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  external_id: string | null;
}

const TCG_OPTIONS = [
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'one-piece', label: 'One Piece' },
  { value: 'magic', label: 'Magic: The Gathering' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'lorcana', label: 'Disney Lorcana' },
  { value: 'riftbound', label: 'Riftbound' },
  { value: 'other', label: 'Other' },
];

const TYPE_OPTIONS = [
  { value: 'booster-box', label: 'Booster Box' },
  { value: 'starter-deck', label: 'Starter Deck' },
  { value: 'collection', label: 'Collection Box' },
  { value: 'promo', label: 'Promo' },
  { value: 'expansion', label: 'Expansion' },
];

export function TCGDropsManager() {
  const [drops, setDrops] = useState<TCGDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDrop, setEditingDrop] = useState<TCGDrop | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tcg: 'pokemon',
    release_date: '',
    type: 'booster-box',
    description: '',
    image_url: '',
    is_active: true,
  });

  const fetchDrops = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cached_tcg_drops')
        .select('*')
        .order('release_date', { ascending: true });

      if (error) throw error;
      setDrops(data || []);
    } catch (error) {
      console.error('Error fetching drops:', error);
      toast.error('Failed to fetch TCG drops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrops();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      tcg: 'pokemon',
      release_date: '',
      type: 'booster-box',
      description: '',
      image_url: '',
      is_active: true,
    });
    setEditingDrop(null);
  };

  const handleOpenDialog = (drop?: TCGDrop) => {
    if (drop) {
      setEditingDrop(drop);
      setFormData({
        name: drop.name,
        tcg: drop.tcg,
        release_date: drop.release_date,
        type: drop.type,
        description: drop.description || '',
        image_url: drop.image_url || '',
        is_active: drop.is_active,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.release_date) {
      toast.error('Name and release date are required');
      return;
    }

    try {
      const dropData = {
        name: formData.name,
        tcg: formData.tcg,
        release_date: formData.release_date,
        type: formData.type,
        description: formData.description || null,
        image_url: formData.image_url || null,
        is_active: formData.is_active,
        external_id: `manual-${formData.tcg}-${formData.name.toLowerCase().replace(/\s+/g, '-')}`,
        updated_at: new Date().toISOString(),
      };

      if (editingDrop) {
        const { error } = await supabase
          .from('cached_tcg_drops')
          .update(dropData)
          .eq('id', editingDrop.id);

        if (error) throw error;
        toast.success('Drop updated successfully');
      } else {
        const { error } = await supabase
          .from('cached_tcg_drops')
          .insert(dropData);

        if (error) throw error;
        toast.success('Drop added successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchDrops();
    } catch (error) {
      console.error('Error saving drop:', error);
      toast.error('Failed to save drop');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this drop?')) return;

    try {
      const { error } = await supabase
        .from('cached_tcg_drops')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Drop deleted');
      fetchDrops();
    } catch (error) {
      console.error('Error deleting drop:', error);
      toast.error('Failed to delete drop');
    }
  };

  const handleToggleActive = async (drop: TCGDrop) => {
    try {
      const { error } = await supabase
        .from('cached_tcg_drops')
        .update({ is_active: !drop.is_active })
        .eq('id', drop.id);

      if (error) throw error;
      toast.success(`Drop ${drop.is_active ? 'deactivated' : 'activated'}`);
      fetchDrops();
    } catch (error) {
      console.error('Error toggling drop:', error);
      toast.error('Failed to update drop');
    }
  };

  const getTcgLabel = (tcg: string) => {
    return TCG_OPTIONS.find(t => t.value === tcg)?.label || tcg;
  };

  const getTypeLabel = (type: string) => {
    return TYPE_OPTIONS.find(t => t.value === type)?.label || type;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              TCG Drops Manager
            </CardTitle>
            <CardDescription>
              Manually manage upcoming TCG product releases shown on the homepage
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchDrops} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Drop
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingDrop ? 'Edit Drop' : 'Add New Drop'}</DialogTitle>
                  <DialogDescription>
                    {editingDrop ? 'Update the drop details below.' : 'Enter the details for the new TCG release.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Prismatic Evolutions"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tcg">TCG *</Label>
                      <Select value={formData.tcg} onValueChange={(v) => setFormData({ ...formData, tcg: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TCG_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="release_date">Release Date *</Label>
                    <Input
                      id="release_date"
                      type="date"
                      value={formData.release_date}
                      onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the product..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">Active</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingDrop ? 'Update' : 'Add'} Drop
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading drops...</div>
        ) : drops.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No TCG drops configured</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first drop to show it on the homepage</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>TCG</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Release Date</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drops.map((drop) => (
                <TableRow key={drop.id} className={!drop.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{drop.name}</TableCell>
                  <TableCell>{getTcgLabel(drop.tcg)}</TableCell>
                  <TableCell>{getTypeLabel(drop.type)}</TableCell>
                  <TableCell>{new Date(drop.release_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Switch
                      checked={drop.is_active}
                      onCheckedChange={() => handleToggleActive(drop)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(drop)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(drop.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
