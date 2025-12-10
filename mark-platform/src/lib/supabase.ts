import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://cqrjiaskaperrmfiuewd.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcmppYXNrYXBlcnJtZml1ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MjkwMDUsImV4cCI6MjA3NjEwNTAwNX0.GbRCx97w6WQEQ4TKozB9tQxhAu6yMVVtFkoDypmlAiY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
