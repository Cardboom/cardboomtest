import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = 'https://dlntgafmjkgtwvflsqsl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbnRnYWZtamtndHd2ZmxzcXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNzkwNDMsImV4cCI6MjA1OTk1NTA0M30.gIcdMBEAmPGdIZ0zzMBBZmLjS9wyQ0-gmGQh3fp0nM';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
