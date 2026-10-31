import { supabaseBrowser } from "@/lib/supabase-browser";
import { obterClientId } from "@/lib/client-id";
import { adicionarAFila } from "@/lib/fila-offline";
import { calcularEstado, estaProgramadoEmBreve, estaVisivelAgora } from "@/lib/estado-alerta";
import type { Alerta, NovoAlerta } from "@/types/alerta";

export type ResultadoReporte = { tipo: "enviado"; alerta: Alerta } | { tipo: "offline" };

/**
 * `status='ativo'` na BD é só a pré-condição (evita trazer tudo o que já
 * foi marcado como resolvido). O que decide se um alerta aparece no mapa
 * é sempre `estaVisivelAgora()` — inclui tanto os confirmados ("ativo")
 * como os que ainda esperam uma 2ª confirmação independente
 * ("por_confirmar", ver Bloco 6 do briefing): estes últimos continuam
 * visíveis de propósito, senão ninguém os veria para os poder confirmar.
 * Cada consumidor decide como distinguir os dois visualmente com
 * `calcularEstado()`/`estaPorConfirmar()` por alerta.
 */
export async function listarAlertasAtivos(): Promise<Alerta[]> {
  const { data, error } = await supabaseBrowser
    .from("alertas")
    .select("*")
    .eq("status", "ativo")
    .order("criado_em", { ascending: false });

  if (error) throw error;
  const agora = new Date();
  return (data ?? []).filter((alerta) => estaVisivelAgora(alerta, agora));
}

export interface EstadoServico {
  ativos: number;
  programadosHoje: number;
  ultimaAtualizacaoOficial: string | null;
}

/**
 * Dados do cartão de estado da home (Bloco 3 do briefing): quantos
 * alertas estão mesmo ativos agora, quantos cortes da E-Redes começam
 * ainda hoje, e há quanto tempo os dados oficiais foram atualizados pela
 * última vez. Uma só leitura (status='ativo') reaproveitada para as três
 * contagens, em vez de três pedidos separados ao Supabase.
 */
export async function obterEstadoServico(): Promise<EstadoServico> {
  const { data, error } = await supabaseBrowser.from("alertas").select("*").eq("status", "ativo");
  if (error) throw error;

  const agora = new Date();
  const fimDoDia = new Date(agora);
  fimDoDia.setHours(23, 59, 59, 999);

  let ativos = 0;
  let programadosHoje = 0;
  let ultimaAtualizacaoOficial: string | null = null;

  for (const alerta of data ?? []) {
    const estado = calcularEstado(alerta, agora);
    if (estado === "ativo") ativos++;
    if (
      estado === "programado" &&
      estaProgramadoEmBreve(alerta, agora) &&
      alerta.data_inicio &&
      new Date(alerta.data_inicio) <= fimDoDia
    ) {
      programadosHoje++;
    }
    if (alerta.origem === "oficial" && (!ultimaAtualizacaoOficial || alerta.atualizado_em > ultimaAtualizacaoOficial)) {
      ultimaAtualizacaoOficial = alerta.atualizado_em;
    }
  }

  return { ativos, programadosHoje, ultimaAtualizacaoOficial };
}

/**
 * Passa pela rota /api/alertas (servidor) em vez de inserir diretamente
 * no Supabase — é lá que o rate limiting é aplicado. A policy de RLS que
 * permitia insert direto do cliente foi removida na Etapa 5.
 *
 * Se a rede falhar mesmo (não um erro do servidor, mas o pedido nem
 * chegar a sair) o reporte fica guardado em fila local e é reenviado
 * sozinho quando a ligação voltar — útil porque é exatamente durante um
 * corte real que a rede do telemóvel também costuma andar fraca.
 */
export async function reportarAlerta(novo: NovoAlerta): Promise<ResultadoReporte> {
  const corpoPedido = { ...novo, client_id: obterClientId() };

  let res: Response;
  try {
    res = await fetch("/api/alertas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpoPedido),
    });
  } catch (erro) {
    if (erro instanceof TypeError) {
      // falha de rede genuína (não uma resposta de erro do servidor)
      adicionarAFila(corpoPedido);
      return { tipo: "offline" };
    }
    throw erro;
  }

  const corpo = await res.json();
  if (!res.ok) throw new Error(corpo.erro ?? "não consegui reportar o alerta");
  return { tipo: "enviado", alerta: corpo };
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
