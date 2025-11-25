import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://cqrjiaskaperrmfiuewd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcmppYXNrYXBlcnJtZml1ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MjkwMDUsImV4cCI6MjA3NjEwNTAwNX0.GbRCx97w6WQEQ4TKozB9tQxhAu6yMVVtFkoDypmlAiY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
