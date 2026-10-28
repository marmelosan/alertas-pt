import { createClient } from "@supabase/supabase-js";
import type { Alerta } from "@/types/alerta";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY em falta — ver .env.local.example"
  );
}

// Cliente anon, seguro para correr no browser (RLS trata das permissões).
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

export type { Alerta };
