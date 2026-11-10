import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Nunca guardamos o IP em bruto — só este hash, pela mesma razão já documentada em 0004_protecao_abuso.sql. */
export function hashDoIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function obterIp(req: NextRequest): string | null {
  const encaminhado = req.headers.get("x-forwarded-for");
  return encaminhado ? encaminhado.split(",")[0].trim() : null;
}

/**
 * Verifica e regista o limite de pedidos por IP para um `tipo` de ação
 * (reporte, voto, denuncia, resolvido) — cada tipo tem o seu próprio
 * orçamento na tabela `limitador_ip` (migração 0010), para confirmar um
 * alerta não gastar o limite de criar reportes novos, nem vice-versa.
 *
 * "Falha a abrir" de propósito, mesmo princípio já usado em
 * /api/alertas: um erro a consultar a tabela nunca deve impedir a ação
 * real de alguém — só um limite confirmado é que bloqueia.
 */
export async function dentroDoLimitePorIp(
  supabase: SupabaseClient,
  params: { req: NextRequest; tipo: string; limite: number; janelaMinutos: number }
): Promise<boolean> {
  const ip = obterIp(params.req);
  if (!ip) return true; // sem IP identificável (raro atrás de um proxy), não bloqueia

  const ipHash = hashDoIp(ip);
  const desde = new Date(Date.now() - params.janelaMinutos * 60_000).toISOString();

  const { count, error } = await supabase
    .from("limitador_ip")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("tipo", params.tipo)
    .gte("criado_em", desde);

  if (error) {
    console.warn(`[limitador-ip] não consegui verificar o limite ("${params.tipo}"):`, error);
    return true;
  }

  if ((count ?? 0) >= params.limite) return false;

  const { error: erroInsercao } = await supabase.from("limitador_ip").insert({ ip_hash: ipHash, tipo: params.tipo });
  if (erroInsercao) {
    console.warn(`[limitador-ip] não consegui registar o pedido ("${params.tipo}"):`, erroInsercao);
  }

  return true;
}
