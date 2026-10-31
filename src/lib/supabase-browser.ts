import { createClient } from "@supabase/supabase-js";
import type { Alerta } from "@/types/alerta";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY em falta — ver .env.local.example. " +
      "O site vai construir à mesma, mas qualquer chamada real ao Supabase falha até as definires."
  );
}

// Cliente anon, seguro para correr no browser (RLS trata das permissões).
// Nunca rebenta ao importar — só falha (de forma tratada pelo código que o
// usa) se alguém tentar mesmo fazer uma chamada sem as env vars definidas.
// Isto é o que permite o build completar na Vercel antes de configurares
// as variáveis de ambiente.
export const supabaseBrowser = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);

export type { Alerta };
