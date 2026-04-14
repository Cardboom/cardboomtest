import { createClient } from '@supabase/supabase-js';

/**
 * External Supabase client for catalog data (catalog_cards, catalog_import_staging, price_events).
 * This is a separate project that holds the canonical card catalog.
 * Uses publishable anon key — safe for frontend.
 */
const EXTERNAL_SUPABASE_URL = 'https://dlntgafmjkgtwvflsqsl.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbnRnYWZtamtndHd2ZmxzcXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDMwMjQsImV4cCI6MjA4MTYxOTAyNH0.0ZWquhQe_pPvRL8aMzRvxI1y38Be4q1N2Fmvj9AW0nM';

export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);
