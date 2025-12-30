-- Email system tables for transactional emails

-- Email templates table for admin customization
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email logs for tracking sent emails
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  resend_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User email preferences
CREATE TABLE public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  welcome_emails BOOLEAN DEFAULT true,
  price_alerts BOOLEAN DEFAULT true,
  sold_notifications BOOLEAN DEFAULT true,
  weekly_digest BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT true,
  order_updates BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read active templates" ON public.email_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON public.email_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own email logs" ON public.email_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert email logs" ON public.email_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage own email preferences" ON public.email_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Insert default email templates
INSERT INTO public.email_templates (template_key, subject, html_content) VALUES
('welcome', 'Welcome to CardBoom! 🎴', '<h1>Welcome to CardBoom!</h1><p>Hi {{name}},</p><p>We''re thrilled to have you join the CardBoom community. Start exploring the marketplace and discover amazing collectibles!</p><p>Best,<br>The CardBoom Team</p>'),
('price_alert', 'Price Alert: {{item_name}} 📈', '<h1>Price Alert</h1><p>Hi {{name}},</p><p>The item <strong>{{item_name}}</strong> you''re watching has changed in price.</p><p>New Price: {{new_price}}</p><p>Previous Price: {{old_price}}</p><a href="{{item_url}}">View Item</a>'),
('item_sold', 'Your item sold! 🎉', '<h1>Congratulations!</h1><p>Hi {{name}},</p><p>Your item <strong>{{item_name}}</strong> has been sold for <strong>{{price}}</strong>!</p><p>The payment will be processed shortly.</p><a href="{{order_url}}">View Order</a>'),
('order_confirmation', 'Order Confirmed #{{order_id}}', '<h1>Order Confirmed</h1><p>Hi {{name}},</p><p>Your order has been confirmed!</p><p>Item: {{item_name}}</p><p>Total: {{price}}</p><a href="{{order_url}}">Track Order</a>'),
('weekly_digest', 'Your Weekly CardBoom Digest 📊', '<h1>Weekly Market Digest</h1><p>Hi {{name}},</p><p>Here''s your weekly market summary:</p>{{digest_content}}<a href="{{site_url}}">Explore More</a>');

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();