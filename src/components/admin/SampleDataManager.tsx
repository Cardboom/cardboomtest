import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database, Trash2, RefreshCw, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const GAMES = [
  { id: 'onepiece', label: 'One Piece', color: 'bg-red-500' },
  { id: 'pokemon', label: 'Pokemon', color: 'bg-yellow-500' },
  { id: 'mtg', label: 'Magic: The Gathering', color: 'bg-purple-500' },
  { id: 'lorcana', label: 'Lorcana', color: 'bg-blue-500' },
  { id: 'riftbound', label: 'Riftbound', color: 'bg-green-500' },
];

export function SampleDataManager() {
  const queryClient = useQueryClient();
  const [batchSize, setBatchSize] = useState(50);
  const [selectedGames, setSelectedGames] = useState<string[]>(['onepiece', 'pokemon', 'mtg', 'lorcana', 'riftbound']);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Fetch sample listing stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['sample-listings-stats'],
    queryFn: async () => {
      const { data: listings, error } = await supabase
        .from('listings')
        .select('id, is_sample, sample_batch_id, created_at')
        .eq('is_sample', true);

      if (error) throw error;

      const { data: batches, error: batchError } = await supabase
        .from('sample_listing_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (batchError) throw batchError;

      return {
        totalSamples: listings?.length || 0,
        batches: batches || [],
      };
    },
  });

  // Seed mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('seed-sample-listings', {
        body: {
          batch_size_per_game: batchSize,
          include_games: selectedGames,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Created ${data.total_created} sample listings`, {
        description: `Batch ID: ${data.batch_id?.slice(0, 8)}...`,
      });
      queryClient.invalidateQueries({ queryKey: ['sample-listings-stats'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to seed sample listings', {
        description: error.message,
      });
    },
  });

  // Purge mutation
  const purgeMutation = useMutation({
    mutationFn: async (batchId?: string) => {
      const { data, error } = await supabase.functions.invoke('purge-sample-listings', {
        body: batchId ? { sample_batch_id: batchId } : {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Deleted ${data.deleted_count} sample listings`);
      setSelectedBatchId(null);
      queryClient.invalidateQueries({ queryKey: ['sample-listings-stats'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to purge sample listings', {
        description: error.message,
      });
    },
  });

  const handleGameToggle = (gameId: string) => {
    setSelectedGames((prev) =>
      prev.includes(gameId) ? prev.filter((g) => g !== gameId) : [...prev, gameId]
    );
  };

  const isWorking = seedMutation.isPending || purgeMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sample Data Manager</h2>
          <p className="text-muted-foreground">
            Seed and manage demo listings for marketplace testing
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Database className="w-4 h-4 mr-2" />
          {statsLoading ? '...' : stats?.totalSamples || 0} Sample Listings
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Seed Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Seed Sample Listings
            </CardTitle>
            <CardDescription>
              Generate demo listings with realistic prices and conditions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Batch Size */}
            <div className="space-y-2">
              <Label htmlFor="batch-size">Listings per game</Label>
              <Input
                id="batch-size"
                type="number"
                min={1}
                max={200}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                disabled={isWorking}
              />
              <p className="text-xs text-muted-foreground">
                Total: ~{batchSize * selectedGames.length} listings
              </p>
            </div>

            {/* Game Selection */}
            <div className="space-y-2">
              <Label>Include Games</Label>
              <div className="grid grid-cols-2 gap-2">
                {GAMES.map((game) => (
                  <div key={game.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={game.id}
                      checked={selectedGames.includes(game.id)}
                      onCheckedChange={() => handleGameToggle(game.id)}
                      disabled={isWorking}
                    />
                    <label
                      htmlFor={game.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <span className={`w-2 h-2 rounded-full ${game.color}`} />
                      {game.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <Button
              onClick={() => seedMutation.mutate()}
              disabled={isWorking || selectedGames.length === 0}
              className="w-full"
            >
              {seedMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Seed {batchSize * selectedGames.length} Listings
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Purge Card */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Purge Sample Listings
            </CardTitle>
            <CardDescription>
              Remove demo listings without affecting real user data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action cannot be undone. Sample listings will be permanently deleted.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => purgeMutation.mutate(undefined)}
                disabled={isWorking || !stats?.totalSamples}
                className="flex-1"
              >
                {purgeMutation.isPending && !selectedBatchId ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Purging...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Purge All ({stats?.totalSamples || 0})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch History */}
      <Card>
        <CardHeader>
          <CardTitle>Batch History</CardTitle>
          <CardDescription>
            Previously created sample listing batches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : stats?.batches && stats.batches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Games</TableHead>
                  <TableHead>Listings</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.batches.map((batch: any) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono text-xs">
                      {batch.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {new Date(batch.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {batch.games?.map((game: string) => (
                          <Badge key={game} variant="secondary" className="text-xs">
                            {game}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{batch.listings_count}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{batch.source_tag}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBatchId(batch.id);
                          purgeMutation.mutate(batch.id);
                        }}
                        disabled={isWorking}
                      >
                        {purgeMutation.isPending && selectedBatchId === batch.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-destructive" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mb-2" />
              <p>No sample batches found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
