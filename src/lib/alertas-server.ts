import { cache } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { paraSlug } from "@/lib/slug";
import type { Alerta } from "@/types/alerta";

/**
 * Leitura server-side (RSC / sitemap / metadata). Usa o mesmo cliente anon
 * do browser — são pedidos HTTP simples via RLS, não há nada específico
 * de browser nisto, por isso é seguro reutilizar no servidor.
 *
 * Envolvidas em `cache()` do React: generateMetadata() e o próprio
 * componente da página pedem os mesmos dados — isto deduplica os pedidos
 * dentro do mesmo render, em vez de ir ao Supabase duas vezes.
 */

export const listarConcelhosComAlertas = cache(async (): Promise<string[]> => {
  const { data, error } = await supabaseBrowser.from("alertas").select("concelho");
  if (error) throw error;

  const unicos = new Set((data ?? []).map((r) => r.concelho));
  return [...unicos];
});

export const obterConcelhoPorSlug = cache(async (slug: string): Promise<string | null> => {
  const concelhos = await listarConcelhosComAlertas();
  return concelhos.find((c) => paraSlug(c) === slug) ?? null;
});

export const listarAlertasDoConcelho = cache(async (concelho: string): Promise<Alerta[]> => {
  const { data, error } = await supabaseBrowser
    .from("alertas")
    .select("*")
    .eq("concelho", concelho)
    .order("status", { ascending: true }) // 'ativo' antes de 'resolvido'
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return data ?? [];
});
