import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = 'https://dlntgafmjkgtwvflsqsl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbnRnYWZtamtndHd2ZmxzcXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDMwMjQsImV4cCI6MjA4MTYxOTAyNH0.0ZWquhQe_pPvRL8aMzRvxI1y38Be4q1N2Fmvj9AW0nM';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
