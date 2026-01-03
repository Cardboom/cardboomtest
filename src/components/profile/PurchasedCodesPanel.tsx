import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Key, Copy, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useDigitalDeliveries } from '@/hooks/useDigitalDeliveries';

export const PurchasedCodesPanel = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const { data: deliveries, isLoading } = useDigitalDeliveries(userId);

  const toggleReveal = (id: string) => {
    setRevealedCodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading your codes...
        </CardContent>
      </Card>
    );
  }

  if (!deliveries || deliveries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            My Digital Codes
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No digital codes purchased yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          My Digital Codes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deliveries.map((delivery) => (
          <div
            key={delivery.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex-1">
              <div className="font-medium">{delivery.product_name}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {delivery.game_name}
                </Badge>
                <span>
                  {new Date(delivery.delivered_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 bg-background rounded text-sm font-mono">
                {revealedCodes.has(delivery.id) 
                  ? delivery.code 
                  : '••••••••••••'}
              </code>
              
              <Button
                size="icon"
                variant="ghost"
                onClick={() => toggleReveal(delivery.id)}
              >
                {revealedCodes.has(delivery.id) 
                  ? <EyeOff className="w-4 h-4" /> 
                  : <Eye className="w-4 h-4" />}
              </Button>
              
              <Button
                size="icon"
                variant="ghost"
                onClick={() => copyCode(delivery.code)}
                disabled={!revealedCodes.has(delivery.id)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
