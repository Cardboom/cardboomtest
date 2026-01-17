import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, Folder, FolderOpen, MoreVertical, Pencil, Trash2, 
  Palette, Star, Heart, Zap, Crown, Gem, Target, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface PortfolioCollection {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_default: boolean;
  sort_order: number;
  item_count?: number;
}

interface PortfolioCollectionsProps {
  userId: string;
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
}

const COLLECTION_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

const COLLECTION_ICONS = [
  { name: 'folder', icon: Folder },
  { name: 'star', icon: Star },
  { name: 'heart', icon: Heart },
  { name: 'zap', icon: Zap },
  { name: 'crown', icon: Crown },
  { name: 'gem', icon: Gem },
  { name: 'target', icon: Target },
  { name: 'sparkles', icon: Sparkles },
];

export const PortfolioCollections = ({
  userId,
  selectedCollectionId,
  onSelectCollection,
}: PortfolioCollectionsProps) => {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCollection, setEditingCollection] = useState<PortfolioCollection | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLLECTION_COLORS[0]);
  const [newIcon, setNewIcon] = useState('folder');

  // Fetch collections with item counts
  const { data: collectionsData, isLoading } = useQuery({
    queryKey: ['portfolio-collections', userId],
    queryFn: async () => {
      const { data: cols, error } = await supabase
        .from('portfolio_collections')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Get item counts per collection
      const { data: items } = await supabase
        .from('portfolio_items')
        .select('collection_id')
        .eq('user_id', userId);

      const counts: Record<string, number> = {};
      let uncategorizedCount = 0;
      
      (items || []).forEach(item => {
        if (item.collection_id) {
          counts[item.collection_id] = (counts[item.collection_id] || 0) + 1;
        } else {
          uncategorizedCount++;
        }
      });

      return {
        collections: (cols || []).map(c => ({ ...c, item_count: counts[c.id] || 0 })) as PortfolioCollection[],
        totalCount: items?.length || 0,
        uncategorizedCount,
      };
    },
    enabled: !!userId,
  });

  const collections = collectionsData?.collections || [];
  const totalCount = collectionsData?.totalCount || 0;
  const uncategorizedCount = collectionsData?.uncategorizedCount || 0;

  // Create collection
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('portfolio_collections').insert({
        user_id: userId,
        name: newName.trim(),
        color: newColor,
        icon: newIcon,
        sort_order: collections.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-collections'] });
      toast.success('Collection created!');
      setShowCreateDialog(false);
      setNewName('');
    },
    onError: () => toast.error('Failed to create collection'),
  });

  // Update collection
  const updateMutation = useMutation({
    mutationFn: async (col: PortfolioCollection) => {
      const { error } = await supabase
        .from('portfolio_collections')
        .update({ name: col.name, color: col.color, icon: col.icon })
        .eq('id', col.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-collections'] });
      toast.success('Collection updated!');
      setEditingCollection(null);
    },
    onError: () => toast.error('Failed to update collection'),
  });

  // Delete collection
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('portfolio_collections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-collections'] });
      toast.success('Collection deleted');
      if (selectedCollectionId === editingCollection?.id) {
        onSelectCollection(null);
      }
    },
    onError: () => toast.error('Failed to delete collection'),
  });

  const getIconComponent = (iconName: string) => {
    const found = COLLECTION_ICONS.find(i => i.name === iconName);
    return found ? found.icon : Folder;
  };

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-2">
      {/* All Items */}
      <button
        onClick={() => onSelectCollection(null)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
          selectedCollectionId === null
            ? "bg-primary/10 text-primary border border-primary/20"
            : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
        )}
      >
        <FolderOpen className="w-4 h-4" />
        <span className="flex-1 font-medium">All Items</span>
        <Badge variant="secondary" className="text-xs">
          {totalCount}
        </Badge>
      </button>

      {/* Uncategorized */}
      {uncategorizedCount > 0 && (
        <button
          onClick={() => onSelectCollection('uncategorized')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
            selectedCollectionId === 'uncategorized'
              ? "bg-muted text-foreground border border-border"
              : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
          )}
        >
          <Folder className="w-4 h-4 opacity-50" />
          <span className="flex-1">Uncategorized</span>
          <Badge variant="outline" className="text-xs">
            {uncategorizedCount}
          </Badge>
        </button>
      )}

      {/* User Collections */}
      {collections.map((col) => {
        const IconComponent = getIconComponent(col.icon);
        return (
          <div key={col.id} className="group relative">
            <button
              onClick={() => onSelectCollection(col.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                selectedCollectionId === col.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <IconComponent className="w-4 h-4" style={{ color: col.color }} />
              <span className="flex-1 truncate">{col.name}</span>
              <Badge variant="secondary" className="text-xs">
                {col.item_count || 0}
              </Badge>
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-7 w-7"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setEditingCollection(col);
                  setNewName(col.name);
                  setNewColor(col.color);
                  setNewIcon(col.icon);
                }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => deleteMutation.mutate(col.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}

      {/* Create New */}
      <Dialog open={showCreateDialog || !!editingCollection} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingCollection(null);
          setNewName('');
        }
      }}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setNewName('');
              setNewColor(COLLECTION_COLORS[0]);
              setNewIcon('folder');
              setShowCreateDialog(true);
            }}
          >
            <Plus className="w-4 h-4" />
            New Collection
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCollection ? 'Edit Collection' : 'Create Collection'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Collection"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      newColor === color && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Icon</label>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_ICONS.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    onClick={() => setNewIcon(name)}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all border",
                      newIcon === name 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingCollection(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingCollection) {
                  updateMutation.mutate({ ...editingCollection, name: newName, color: newColor, icon: newIcon });
                } else {
                  handleCreate();
                }
              }}
              disabled={!newName.trim()}
            >
              {editingCollection ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Component to assign items to collections
interface AssignToCollectionProps {
  userId: string;
  itemIds: string[];
  onAssigned: () => void;
}

export const AssignToCollectionDropdown = ({ userId, itemIds, onAssigned }: AssignToCollectionProps) => {
  const queryClient = useQueryClient();

  const { data: collections = [] } = useQuery({
    queryKey: ['portfolio-collections', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_collections')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const assignMutation = useMutation({
    mutationFn: async (collectionId: string | null) => {
      const { error } = await supabase
        .from('portfolio_items')
        .update({ collection_id: collectionId })
        .in('id', itemIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-items'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-collections'] });
      toast.success('Items moved to collection');
      onAssigned();
    },
    onError: () => toast.error('Failed to move items'),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Folder className="w-4 h-4" />
          Move to...
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => assignMutation.mutate(null)}>
          <Folder className="w-4 h-4 mr-2 opacity-50" />
          Uncategorized
        </DropdownMenuItem>
        {collections.map((col: any) => (
          <DropdownMenuItem key={col.id} onClick={() => assignMutation.mutate(col.id)}>
            <Folder className="w-4 h-4 mr-2" style={{ color: col.color }} />
            {col.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
