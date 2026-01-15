import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface OrderReceiptProps {
  order: {
    id: string;
    created_at: string;
    price: number;
    buyer_fee: number;
    seller_fee: number;
    status: string;
    delivery_option: string;
    tracking_number: string | null;
    shipping_address?: {
      name?: string;
      address?: string;
      city?: string;
      district?: string;
      postalCode?: string;
      phone?: string;
    } | null;
    listing: {
      title: string;
      condition: string;
      category: string | null;
      grade: string | null;
      grading_company: string | null;
    } | null;
    buyer_profile: {
      username: string;
    } | null;
    seller_profile: {
      username: string;
    } | null;
  };
  formatPrice: (amount: number) => string;
}

export const OrderReceipt = ({ order, formatPrice }: OrderReceiptProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const generateReceipt = async () => {
    setIsGenerating(true);

    try {
      // Create a printable receipt HTML
      const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CardBoom Receipt - ${order.id.slice(0, 8)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      background: #fff;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #0ea5e9;
    }
    .logo {
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .logo span { font-weight: 400; }
    .receipt-info {
      text-align: right;
      font-size: 14px;
      color: #666;
    }
    .receipt-info h2 {
      font-size: 20px;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .item-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
    }
    .item-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .item-details {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .item-badge {
      background: #e0f2fe;
      color: #0369a1;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .party {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
    }
    .party-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      margin-bottom: 4px;
    }
    .party-name {
      font-weight: 600;
      font-size: 16px;
    }
    .pricing {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .price-row.total {
      border-top: 2px solid #e2e8f0;
      margin-top: 12px;
      padding-top: 16px;
      font-size: 18px;
      font-weight: 700;
    }
    .price-row.total .amount { color: #0ea5e9; }
    .muted { color: #666; }
    .shipping {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 16px;
    }
    .shipping-address {
      font-size: 14px;
      line-height: 1.6;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
    .footer p { margin-bottom: 4px; }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-completed { background: #dcfce7; color: #166534; }
    .status-paid { background: #dbeafe; color: #1e40af; }
    .status-shipped { background: #f3e8ff; color: #7c3aed; }
    .status-pending { background: #fef9c3; color: #a16207; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Card<span>Boom</span></div>
    <div class="receipt-info">
      <h2>Purchase Receipt</h2>
      <p>Order #${order.id.slice(0, 8).toUpperCase()}</p>
      <p>${format(new Date(order.created_at), 'MMMM d, yyyy')}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Order Status</div>
    <span class="status-badge status-${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
  </div>

  <div class="section">
    <div class="section-title">Item Details</div>
    <div class="item-card">
      <div class="item-title">${order.listing?.title || 'Unknown Item'}</div>
      <div class="item-details">
        ${order.listing?.condition ? `<span class="item-badge">${order.listing.condition}</span>` : ''}
        ${order.listing?.category ? `<span class="item-badge">${order.listing.category}</span>` : ''}
        ${order.listing?.grade ? `<span class="item-badge">${order.listing.grading_company || 'Graded'}: ${order.listing.grade}</span>` : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Transaction Parties</div>
    <div class="parties">
      <div class="party">
        <div class="party-label">Buyer</div>
        <div class="party-name">${order.buyer_profile?.username || 'Anonymous'}</div>
      </div>
      <div class="party">
        <div class="party-label">Seller</div>
        <div class="party-name">${order.seller_profile?.username || 'Anonymous'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Price Breakdown</div>
    <div class="pricing">
      <div class="price-row">
        <span class="muted">Item Price</span>
        <span>${formatPrice(order.price)}</span>
      </div>
      <div class="price-row">
        <span class="muted">Buyer Protection Fee</span>
        <span>${formatPrice(order.buyer_fee)}</span>
      </div>
      <div class="price-row total">
        <span>Total Paid</span>
        <span class="amount">${formatPrice(order.price + order.buyer_fee)}</span>
      </div>
    </div>
  </div>

  ${order.delivery_option === 'ship' && order.shipping_address ? `
  <div class="section">
    <div class="section-title">Delivery Information</div>
    <div class="shipping">
      <div class="shipping-address">
        <strong>${order.shipping_address.name || ''}</strong><br>
        ${order.shipping_address.address || ''}<br>
        ${order.shipping_address.district || ''}, ${order.shipping_address.city || ''}<br>
        ${order.shipping_address.postalCode || ''}
        ${order.tracking_number ? `<br><br><strong>Tracking:</strong> ${order.tracking_number}` : ''}
      </div>
    </div>
  </div>
  ` : ''}

  ${order.delivery_option === 'vault' ? `
  <div class="section">
    <div class="section-title">Storage</div>
    <div class="shipping">
      <p>This item is securely stored in the CardBoom Vault.</p>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>Brainbaby Bilişim A.Ş.</strong></p>
    <p>MERSIS: 0187173385800001 | Tax ID: 1871733858</p>
    <p>Thank you for shopping with CardBoom!</p>
    <p style="margin-top: 12px;">support@cardboom.com | www.cardboom.com</p>
  </div>
</body>
</html>
      `.trim();

      // Open in new window for printing/saving as PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
        
        // Auto-trigger print dialog after a brief delay
        setTimeout(() => {
          printWindow.print();
        }, 500);
        
        setIsGenerated(true);
        toast.success('Receipt opened - use "Save as PDF" in the print dialog');
        
        // Reset after 3 seconds
        setTimeout(() => setIsGenerated(false), 3000);
      } else {
        toast.error('Please allow popups to download the receipt');
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to generate receipt');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generateReceipt}
      disabled={isGenerating}
      className="gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : isGenerated ? (
        <>
          <Check className="w-4 h-4 text-green-500" />
          Opened
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4" />
          Receipt
        </>
      )}
    </Button>
  );
};
