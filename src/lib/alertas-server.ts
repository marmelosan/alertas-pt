import { cache } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { paraSlug } from "@/lib/slug";
import { calcularEstado, estaProgramadoEmBreve } from "@/lib/estado-alerta";
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

export interface ConcelhosAtivosPorOrigem {
  oficial: string[];
  comunidade: string[];
}

/**
 * Todas as linhas com status='ativo' na BD — ponto único de leitura
 * reaproveitado por `listarConcelhosComAlertasAtivos`, `listarCartoesConcelhos`
 * e `listarConcelhosComCortesProgramados`, em vez de cada uma ir ao
 * Supabase por sua conta. `status='ativo'` é só a pré-condição; quem decide
 * mesmo o que conta como ativo/programado é sempre `calcularEstado()`.
 */
const listarAlertasComStatusAtivo = cache(async (): Promise<Alerta[]> => {
  const { data, error } = await supabaseBrowser.from("alertas").select("*").eq("status", "ativo");
  if (error) throw error;
  return data ?? [];
});

/**
 * Concelhos com pelo menos um alerta a assinalar no mapa, separados por
 * origem — usado para colorir o mapa por concelho. Reportes da comunidade
 * só contam enquanto "ativo" (não há noção de "programado" para eles); já
 * os cortes oficiais da E-Redes contam também quando "programado" dentro
 * dos próximos 7 dias — a legenda do mapa diz "Corte programado (E-Redes)"
 * precisamente para isto, e um corte de amanhã já marcado na BD devia
 * aparecer assinalado hoje, não só no dia em que começa.
 */
export const listarConcelhosComAlertasAtivos = cache(async (): Promise<ConcelhosAtivosPorOrigem> => {
  const alertas = await listarAlertasComStatusAtivo();
  const agora = new Date();
  const oficial = new Set<string>();
  const comunidade = new Set<string>();
  for (const alerta of alertas) {
    const estado = calcularEstado(alerta, agora);
    if (alerta.origem === "oficial") {
      if (estado === "ativo" || estaProgramadoEmBreve(alerta, agora)) oficial.add(alerta.concelho);
    } else if (estado === "ativo") {
      comunidade.add(alerta.concelho);
    }
  }
  return { oficial: [...oficial], comunidade: [...comunidade] };
});

export interface AlertaMapaConcelho {
  id: string;
  tipo_servico: Alerta["tipo_servico"];
  origem: Alerta["origem"];
  concelho: string;
  freguesia: string | null;
  latitude: number;
  longitude: number;
  data_inicio: string | null;
  estadoVisual: "ativo" | "programado";
}

/**
 * Os mesmos alertas de `listarConcelhosComAlertasAtivos`, mas devolvidos
 * como pontos com coordenada real em vez de só o nome do concelho — para
 * pôr os mesmos pins do mapa da home também aqui. O preenchimento do
 * polígono acima depende do nome do concelho bater certo com o GeoJSON
 * (`paraSlug`); um pin não depende disso, aparece sempre no sítio exato
 * mesmo que a geocodificação tenha devolvido um nome ligeiramente
 * diferente do nome oficial do concelho.
 */
export const listarAlertasParaMapaConcelhos = cache(async (): Promise<AlertaMapaConcelho[]> => {
  const alertas = await listarAlertasComStatusAtivo();
  const agora = new Date();
  const pontos: AlertaMapaConcelho[] = [];

  for (const alerta of alertas) {
    const estado = calcularEstado(alerta, agora);
    const estadoVisual: AlertaMapaConcelho["estadoVisual"] | null =
      estado === "ativo" ? "ativo" : alerta.origem === "oficial" && estaProgramadoEmBreve(alerta, agora) ? "programado" : null;
    if (!estadoVisual) continue;

    pontos.push({
      id: alerta.id,
      tipo_servico: alerta.tipo_servico,
      origem: alerta.origem,
      concelho: alerta.concelho,
      freguesia: alerta.freguesia,
      latitude: alerta.latitude,
      longitude: alerta.longitude,
      data_inicio: alerta.data_inicio,
      estadoVisual,
    });
  }

  return pontos;
});

export interface CartaoConcelho {
  concelho: string;
  total: number;
  oficial: boolean;
  comunidade: boolean;
}

/** Um "cartão" por concelho com alertas ativos — nome, contagem total, e que origens contribuem. */
export const listarCartoesConcelhos = cache(async (): Promise<CartaoConcelho[]> => {
  const alertas = await listarAlertasComStatusAtivo();
  const agora = new Date();
  const porConcelho = new Map<string, CartaoConcelho>();

  for (const alerta of alertas) {
    if (calcularEstado(alerta, agora) !== "ativo") continue;
    const atual = porConcelho.get(alerta.concelho) ?? {
      concelho: alerta.concelho,
      total: 0,
      oficial: false,
      comunidade: false,
    };
    atual.total++;
    if (alerta.origem === "oficial") atual.oficial = true;
    else atual.comunidade = true;
    porConcelho.set(alerta.concelho, atual);
  }

  return [...porConcelho.values()].sort((a, b) => a.concelho.localeCompare(b.concelho, "pt"));
});

/** Concelhos com cortes oficiais da E-Redes programados para os próximos 7 dias (ainda não começaram). */
export const listarConcelhosComCortesProgramados = cache(async (): Promise<string[]> => {
  const alertas = await listarAlertasComStatusAtivo();
  const agora = new Date();
  const concelhos = new Set<string>();
  for (const alerta of alertas) {
    if (alerta.origem === "oficial" && estaProgramadoEmBreve(alerta, agora)) concelhos.add(alerta.concelho);
  }
  return [...concelhos];
});

/**
 * Timestamp da última linha de origem oficial tocada pela sincronização —
 * usado para mostrar "dados da E-Redes atualizados há X" e detetar quando
 * o cron parou de correr (ver Bloco 1, ponto 4 do briefing).
 */
export const obterUltimaAtualizacaoOficial = cache(async (): Promise<string | null> => {
  const { data, error } = await supabaseBrowser
    .from("alertas")
    .select("atualizado_em")
    .eq("origem", "oficial")
    .order("atualizado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.atualizado_em ?? null;
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
