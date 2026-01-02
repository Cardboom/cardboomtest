import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Zap, Bell, CheckCircle, XCircle, 
  ArrowUpDown, RefreshCw, Sparkles
} from 'lucide-react';
import { useAutoMatches } from '@/hooks/useAutoMatches';
import { AutoMatchNotification } from './AutoMatchNotification';

interface AutoMatchPanelProps {
  defaultRole?: 'buyer' | 'seller' | 'all';
}

export const AutoMatchPanel = ({ defaultRole = 'all' }: AutoMatchPanelProps) => {
  const [role, setRole] = useState<'buyer' | 'seller' | 'all'>(defaultRole);
  const { 
    pendingMatches, 
    acceptedMatches, 
    loading, 
    error,
    refetch,
    acceptMatch,
    rejectMatch
  } = useAutoMatches(role);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            Auto-Match Engine
            {pendingMatches.length > 0 && (
              <Badge className="bg-primary text-primary-foreground">
                {pendingMatches.length} new
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 0.5, repeat: isRefreshing ? Infinity : 0 }}
            >
              <RefreshCw className="h-4 w-4" />
            </motion.div>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically matches your buy orders with listings and vice versa
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Role Filter */}
        <Tabs value={role} onValueChange={(v) => setRole(v as typeof role)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="gap-1">
              <ArrowUpDown className="h-3 w-3" />
              All
            </TabsTrigger>
            <TabsTrigger value="buyer" className="gap-1">
              <Bell className="h-3 w-3" />
              Buying
            </TabsTrigger>
            <TabsTrigger value="seller" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Selling
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-6 text-muted-foreground">
            <XCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p>{error}</p>
            <Button variant="link" onClick={refetch}>Try again</Button>
          </div>
        )}

        {/* Pending Matches */}
        {!loading && !error && (
          <>
            {pendingMatches.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {pendingMatches.map((match) => (
                    <AutoMatchNotification
                      key={match.id}
                      match={match}
                      onAccept={acceptMatch}
                      onReject={rejectMatch}
                      viewAs={role === 'buyer' ? 'buyer' : 'seller'}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-muted-foreground" />
                </div>
                <h4 className="font-medium mb-1">No matches yet</h4>
                <p className="text-sm text-muted-foreground">
                  {role === 'buyer' 
                    ? 'Create buy orders to get matched with sellers'
                    : role === 'seller'
                    ? 'List items to get matched with buyers'
                    : 'Create listings or buy orders to start matching'
                  }
                </p>
              </div>
            )}

            {/* Recent Accepted */}
            {acceptedMatches.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gain" />
                  Recently Matched ({acceptedMatches.length})
                </h4>
                <div className="space-y-2">
                  {acceptedMatches.slice(0, 3).map((match) => (
                    <div 
                      key={match.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-gain/5 border border-gain/20"
                    >
                      <span className="text-sm truncate flex-1">
                        {match.listing?.title || match.buy_order?.item_name}
                      </span>
                      <Badge variant="outline" className="text-gain border-gain/30">
                        ${match.listing?.price?.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
