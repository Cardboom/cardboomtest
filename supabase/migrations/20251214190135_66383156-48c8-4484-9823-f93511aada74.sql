-- Enable full replica identity for real-time updates
ALTER TABLE market_items REPLICA IDENTITY FULL;

-- Add to realtime publication if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'market_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE market_items;
  END IF;
END $$;

-- Also enable for listings table
ALTER TABLE listings REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'listings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE listings;
  END IF;
END $$;