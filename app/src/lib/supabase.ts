import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://wiiexzxuxyyglgwlwpcj.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpaWV4enh1eHl5Z2xnd2x3cGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MTQ5NDYsImV4cCI6MjEwMDk5MDk0Nn0.uMr8AAlMRWT9pQKE1oY9v10BFgxT-MujTFj0aw38kF0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
