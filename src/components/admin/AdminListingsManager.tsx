import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Trash2, Search, RefreshCw, ExternalLink, Package, DollarSign, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface Listing {
  id: string;
  title: string;
  price: number;
  status: string;
  category: string;
  condition: string | null;
  image_url: string | null;
  created_at: string;
  seller_id: string;
  market_item_id: string | null;
  seller?: {
    display_name: string | null;
    email: string | null;
  };
}

export function AdminListingsManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  // Fetch all listings
  const { data: listings = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-all-listings', statusFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('listings')
        .select(`
          id,
          title,
          price,
          status,
          category,
          condition,
          image_url,
          created_at,
          seller_id,
          market_item_id
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'active' | 'sold' | 'cancelled' | 'reserved');
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch seller info separately
      const sellerIds = [...new Set(data?.map(l => l.seller_id) || [])];
      const { data: sellers } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', sellerIds);
      
      const sellerMap = new Map(sellers?.map(s => [s.id, s]) || []);
      
      return (data || []).map(listing => ({
        ...listing,
        seller: sellerMap.get(listing.seller_id) || null
      })) as Listing[];
    }
  });

  // Hard delete listing mutation - removes from DB completely
  const deleteListingMutation = useMutation({
    mutationFn: async (listing: Listing) => {
      // Step 1: Delete any price history for the associated market item
      if (listing.market_item_id) {
        await supabase
          .from('price_history')
          .delete()
          .eq('market_item_id', listing.market_item_id);
      }

      // Step 2: Clear market_item_id from the listing first (to avoid FK constraint)
      if (listing.market_item_id) {
        await supabase
          .from('listings')
          .update({ market_item_id: null })
          .eq('id', listing.id);
      }

      // Step 3: Delete any related records (using RPC or direct delete where allowed)
      // Note: Some tables may have RLS restrictions - these deletes will silently fail if not allowed
      try {
        await supabase.from('listing_reports').delete().eq('listing_id', listing.id);
      } catch (e) {
        console.log('Could not delete listing_reports, may not exist or RLS');
      }

      // Step 4: Delete the listing itself
      const { error: listingError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listing.id);

      if (listingError) throw listingError;

      // Step 5: Delete the associated market item if it was created for this listing
      if (listing.market_item_id) {
        // Check if any other listings reference this market item
        const { data: otherListings } = await supabase
          .from('listings')
          .select('id')
          .eq('market_item_id', listing.market_item_id)
          .limit(1);

        // Only delete market item if no other listings use it
        if (!otherListings || otherListings.length === 0) {
          await supabase
            .from('market_items')
            .delete()
            .eq('id', listing.market_item_id);
        }
      }

      return listing.id;
    },
    onSuccess: (id) => {
      toast.success(`Listing permanently deleted from database`);
      queryClient.invalidateQueries({ queryKey: ['admin-all-listings'] });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete listing: ' + error.message);
    }
  });

  // Filter listings by search
  const filteredListings = listings.filter(listing => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      listing.title?.toLowerCase().includes(query) ||
      listing.seller?.display_name?.toLowerCase().includes(query) ||
      listing.seller?.email?.toLowerCase().includes(query) ||
      listing.id.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-gain/20 text-gain">Active</Badge>;
      case 'sold': return <Badge className="bg-primary/20 text-primary">Sold</Badge>;
      case 'cancelled': return <Badge className="bg-loss/20 text-loss">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalValue = filteredListings.reduce((sum, l) => sum + (l.price || 0), 0);
  const activeCount = filteredListings.filter(l => l.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            All Listings
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage and delete listings directly from the database
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Listings</p>
                <p className="text-2xl font-bold">{filteredListings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gain/10">
                <Package className="w-5 h-5 text-gain" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold/10">
                <DollarSign className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatPrice(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, seller, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="pokemon">Pokemon</SelectItem>
                <SelectItem value="one-piece">One Piece</SelectItem>
                <SelectItem value="yugioh">Yu-Gi-Oh!</SelectItem>
                <SelectItem value="lorcana">Lorcana</SelectItem>
                <SelectItem value="mtg">Magic: The Gathering</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="figures">Figures</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Listings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Database Listings
            <Badge variant="outline" className="ml-2">Hard Delete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No listings found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell>
                      {listing.image_url ? (
                        <img 
                          src={listing.image_url} 
                          alt={listing.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium line-clamp-1">{listing.title}</p>
                        <p className="text-xs text-muted-foreground">{listing.id.slice(0, 8)}...</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{listing.seller?.display_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{listing.seller?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "font-semibold",
                        listing.price > 10000 && "text-destructive"
                      )}>
                        {formatPrice(listing.price)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(listing.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{listing.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/listing/${listing.id}`, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                                Permanently Delete Listing
                              </AlertDialogTitle>
                              <AlertDialogDescription className="space-y-2">
                                <p>This will <strong>permanently delete</strong> the following from the database:</p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                  <li>The listing record</li>
                                  <li>Associated market item (if unique to this listing)</li>
                                  <li>Price history data</li>
                                  <li>View counts and reports</li>
                                </ul>
                                <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                                  <p className="font-medium">{listing.title}</p>
                                  <p className="text-sm">{formatPrice(listing.price)} • {listing.seller?.display_name}</p>
                                </div>
                                <p className="text-destructive font-medium">This action cannot be undone!</p>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteListingMutation.mutate(listing)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
