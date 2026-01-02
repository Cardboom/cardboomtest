import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Clock, Package, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BuyOrder {
  id: string;
  buyer_id: string;
  market_item_id: string | null;
  category: string;
  item_name: string;
  condition: string | null;
  grade: string | null;
  max_price: number;
  quantity: number;
  filled_quantity: number;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  buyer?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface BuyOrderCardProps {
  order: BuyOrder;
  onAccept?: (orderId: string) => void;
  showAcceptButton?: boolean;
}

export const BuyOrderCard = ({ order, onAccept, showAcceptButton = true }: BuyOrderCardProps) => {
  const [isAccepting, setIsAccepting] = useState(false);

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  const handleAccept = async () => {
    if (!onAccept) return;
    setIsAccepting(true);
    try {
      onAccept(order.id);
    } finally {
      setIsAccepting(false);
    }
  };

  const remainingQty = order.quantity - order.filled_quantity;
  const isExpired = order.expires_at && new Date(order.expires_at) < new Date();

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <Badge variant="outline" className="text-xs">
                Instant Offer
              </Badge>
              {order.grade && (
                <Badge variant="secondary" className="text-xs">
                  {order.grade}
                </Badge>
              )}
            </div>
            
            <h4 className="font-semibold truncate">{order.item_name}</h4>
            
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {order.category}
              </span>
              {order.condition && (
                <span>{order.condition}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </span>
            </div>

            {order.buyer && (
              <div className="flex items-center gap-2 mt-3">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={order.buyer.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {order.buyer.display_name?.[0] || 'B'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {order.buyer.display_name || 'Anonymous'}
                </span>
              </div>
            )}

            {order.notes && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {order.notes}
              </p>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-xl font-bold text-green-500">
              <DollarSign className="w-5 h-5" />
              {formatPrice(order.max_price)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Qty: {remainingQty} / {order.quantity}
            </p>
            
            {showAcceptButton && !isExpired && remainingQty > 0 && (
              <Button
                size="sm"
                className="mt-3 gap-1"
                onClick={handleAccept}
                disabled={isAccepting}
              >
                <Zap className="w-3.5 h-3.5" />
                {isAccepting ? 'Accepting...' : 'Sell Now'}
              </Button>
            )}
            
            {isExpired && (
              <Badge variant="destructive" className="mt-3">
                Expired
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
