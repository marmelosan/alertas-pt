import { supabaseBrowser } from "@/lib/supabase-browser";
import { obterClientId } from "@/lib/client-id";
import type { Alerta, NovoAlerta } from "@/types/alerta";

export async function listarAlertasAtivos(): Promise<Alerta[]> {
  const { data, error } = await supabaseBrowser
    .from("alertas")
    .select("*")
    .eq("status", "ativo")
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Passa pela rota /api/alertas (servidor) em vez de inserir diretamente
 * no Supabase — é lá que o rate limiting é aplicado. A policy de RLS que
 * permitia insert direto do cliente foi removida na Etapa 5.
 */
export async function reportarAlerta(novo: NovoAlerta): Promise<Alerta> {
  const res = await fetch("/api/alertas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...novo, client_id: obterClientId() }),
  });

  const corpo = await res.json();
  if (!res.ok) throw new Error(corpo.erro ?? "não consegui reportar o alerta");
  return corpo;
}

export async function confirmarAlerta(id: string): Promise<Alerta> {
  const { data, error } = await supabaseBrowser.rpc("votar_alerta", {
    alerta_id: id,
  });

  if (error) throw error;
  return data;
}

export async function denunciarAlerta(id: string): Promise<Alerta> {
  const { data, error } = await supabaseBrowser.rpc("denunciar_alerta", {
    alerta_id: id,
  });

  if (error) throw error;
  return data;
}
