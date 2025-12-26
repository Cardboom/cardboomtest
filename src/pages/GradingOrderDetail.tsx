import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGrading, GradingOrder, GRADING_CATEGORIES } from '@/hooks/useGrading';
import { GradingResultCard } from '@/components/grading/GradingResultCard';
import { OrderStatusTimeline } from '@/components/grading/OrderStatusTimeline';
import { CardOverlayPreview } from '@/components/grading/CardOverlayPreview';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { 
  ArrowLeft, 
  Clock, 
  Mail,
  RefreshCw,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

export default function GradingOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOrder } = useGrading();
  const [order, setOrder] = useState<GradingOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      setIsLoading(true);
      const data = await getOrder(id);
      setOrder(data);
      setIsLoading(false);
    };
    fetchOrder();
  }, [id, getOrder]);

  const category = order ? GRADING_CATEGORIES.find(c => c.id === order.category) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <Button onClick={() => navigate('/grading/orders')}>Back to Orders</Button>
        </main>
      </div>
    );
  }

  const isCompleted = order.status === 'completed';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/grading/orders')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order Details</h1>
            <p className="text-muted-foreground">
              {category?.icon} {category?.name} • Order #{order.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Results or Status */}
          <div className="space-y-6">
            {isCompleted ? (
              <GradingResultCard order={order} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Order Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OrderStatusTimeline 
                    status={order.status}
                    paidAt={order.paid_at}
                    submittedAt={order.submitted_at}
                    completedAt={order.completed_at}
                  />
                </CardContent>
              </Card>
            )}

            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Submitted</span>
                  </div>
                  <span className="font-medium">
                    {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    <span>Price Paid</span>
                  </div>
                  <span className="font-medium">${order.price_usd}</span>
                </div>

                {order.paid_at && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Payment Date</span>
                    </div>
                    <span className="font-medium">
                      {format(new Date(order.paid_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}

                {order.completed_at && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Completed</span>
                    </div>
                    <span className="font-medium">
                      {format(new Date(order.completed_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Support */}
            {!isCompleted && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-primary" />
                    <span>Need help with this order?</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/help')}>
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Card Preview */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Card Preview</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center py-8">
                <CardOverlayPreview order={order} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
