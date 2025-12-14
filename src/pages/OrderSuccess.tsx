import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Package, Vault, Truck, ArrowRight, Home, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const state = location.state as {
    orderId: string;
    title: string;
    price: number;
    fees: {
      buyerFee: number;
      totalBuyerPays: number;
    };
    deliveryOption: string;
    imageUrl?: string;
  } | null;

  // If no state, show generic success
  if (!state) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        <main className="container mx-auto px-4 py-16 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <CheckCircle2 className="w-24 h-24 text-gain mx-auto mb-6" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">
            Order Complete!
          </h1>
          <p className="text-muted-foreground mb-8">
            Your order #{orderId?.slice(0, 8)} has been processed successfully.
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => navigate('/portfolio')} className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              View Portfolio
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
              <Home className="w-4 h-4" />
              Home
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const getDeliveryIcon = () => {
    switch (state.deliveryOption) {
      case 'vault':
        return <Vault className="w-5 h-5" />;
      case 'ship':
        return <Truck className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const getDeliveryText = () => {
    switch (state.deliveryOption) {
      case 'vault':
        return 'Your item has been added to your Vault';
      case 'ship':
        return 'Your item will be shipped to you';
      default:
        return 'Trade will be processed';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-center mb-8"
          >
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gain/20 rounded-full animate-ping" />
              <CheckCircle2 className="w-20 h-20 md:w-24 md:h-24 text-gain relative z-10" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-2">
              Purchase Successful!
            </h1>
            <p className="text-muted-foreground">
              Order #{state.orderId?.slice(0, 8).toUpperCase()}
            </p>
          </motion.div>

          {/* Order Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="mb-6 overflow-hidden">
              <CardContent className="p-0">
                {/* Item Preview */}
                <div className="flex items-center gap-4 p-4 md:p-6 border-b border-border">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    {state.imageUrl ? (
                      <img 
                        src={state.imageUrl} 
                        alt={state.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {state.title}
                    </h3>
                    <Badge variant="outline" className="mt-1 gap-1">
                      {getDeliveryIcon()}
                      {state.deliveryOption === 'vault' ? 'Vault' : state.deliveryOption === 'ship' ? 'Shipping' : 'Trade'}
                    </Badge>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="p-4 md:p-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Item Price</span>
                    <span className="text-foreground">${state.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Buyer Fee (5%)</span>
                    <span className="text-foreground">${state.fees.buyerFee.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-foreground">Total Paid</span>
                    <span className="text-primary">${state.fees.totalBuyerPays.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Delivery Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="mb-8">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {getDeliveryIcon()}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Next Steps</p>
                    <p className="text-sm text-muted-foreground">{getDeliveryText()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button 
              onClick={() => navigate('/portfolio')} 
              className="flex-1 gap-2"
              size="lg"
            >
              <ShoppingBag className="w-4 h-4" />
              View in Portfolio
            </Button>
            {state.deliveryOption === 'vault' && (
              <Button 
                onClick={() => navigate('/vault')} 
                variant="outline"
                className="flex-1 gap-2"
                size="lg"
              >
                <Vault className="w-4 h-4" />
                View Vault
              </Button>
            )}
            <Button 
              onClick={() => navigate('/explorer')} 
              variant="outline"
              className="flex-1 gap-2"
              size="lg"
            >
              Continue Shopping
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderSuccess;
