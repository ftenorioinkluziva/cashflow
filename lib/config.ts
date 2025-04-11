// Environment variables configuration
export const config = {
  // Supabase configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    serviceKey: process.env.API_KEY || "", // Using the API_KEY environment variable
  },
  // Application settings
  app: {
    name: "Sistema de Controle Financeiro",
    version: "1.0.0",
  },
}
