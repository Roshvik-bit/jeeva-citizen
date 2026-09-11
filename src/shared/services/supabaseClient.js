import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://ainetahaisilqyuljdul.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_kKSYnzjlFQkmTzt7Wa5CvQ_Rj722d8E";

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith("http")
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;
