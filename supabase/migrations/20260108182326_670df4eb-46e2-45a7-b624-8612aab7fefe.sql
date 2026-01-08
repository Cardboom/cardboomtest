-- Create a trigger to automatically mark listings as sold when an order is created
CREATE OR REPLACE FUNCTION public.mark_listing_sold_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark the listing as sold when order is created with status 'paid'
  IF NEW.status = 'paid' THEN
    UPDATE public.listings 
    SET status = 'sold', updated_at = now()
    WHERE id = NEW.listing_id AND status = 'active';
    
    -- Also send notification to seller about the sale
    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT 
      NEW.seller_id,
      'sale',
      '🎉 Card Sold!',
      'Your listing has been purchased. Please ship the card or arrange delivery.',
      jsonb_build_object('order_id', NEW.id, 'listing_id', NEW.listing_id, 'delivery_option', NEW.delivery_option);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_mark_listing_sold ON public.orders;

-- Create the trigger
CREATE TRIGGER trigger_mark_listing_sold
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.mark_listing_sold_on_order();

-- Also fix the Monkey D. Luffy listing that wasn't marked as sold
UPDATE public.listings SET status = 'sold' WHERE id = '04b182a5-1034-4867-bfed-b98cdcaf7123';