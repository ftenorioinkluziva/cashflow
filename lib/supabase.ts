import { createClient } from "@supabase/supabase-js"
import { config } from "./config"

// Create a single supabase client for interacting with your database
export const supabase = createClient(config.supabase.url, config.supabase.anonKey)

// Create a service role client for admin operations (server-side only)
export const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceKey)
