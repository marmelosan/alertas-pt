import { extrairAvisosTejoAmbiente, horaTejoAmbienteParaTimestamptz, type AvisoTejoAmbiente } from "@/lib/tejo-ambiente";
import { geocodificarLocalidade } from "@/lib/geo";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type SupabaseServiceClient = ReturnType<typeof getSupabaseServiceClient>;
type CacheGeocodificacao = Map<string, { lat: number; lon: number }>;

const URL_AVISOS = "https://tejoambiente.pt/faltas-de-agua-avisos/";

interface AlertaAguaPreparado {
  external_id: string;
  tipo_servico: "agua";
  concelho: string;
  freguesia: string | null;
  latitude: number;
  longitude: number;
  descricao: string | null;
  origem: "oficial";
  data_inicio: string | null;
  data_fim: string | null;
  status: "ativo";
}

function normalizarChaveGeocodificacao(texto: string): string {
  return texto.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * "Localidades / Locais Afetados" às vezes lista mais do que um lugar
 * ("Codes, Portela da Selada e Brescovo") ou uma rua com zona entre
 * parênteses ("Estrada das Galegas (Portela Vila Verde)") — para a
 * geocodificação, o primeiro lugar mencionado já chega para situar o pin
 * na zona certa; não vale a pena tentar resolver todos.
 */
function primeiraLocalidade(localidades: string): string {
  return localidades.split(/[,(]/)[0].trim();
}

async function geocodificar(
  aviso: AvisoTejoAmbiente,
  cache: CacheGeocodificacao,
  supabase: SupabaseServiceClient
): Promise<{ lat: number; lon: number } | null> {
  const lugar = primeiraLocalidade(aviso.localidades);
  const chavePrincipal = normalizarChaveGeocodificacao(`${lugar}|${aviso.municipio}`);
  const chaveFallback = normalizarChaveGeocodificacao(aviso.municipio);

  for (const [chave, consulta] of [
    [chavePrincipal, `${lugar}, ${aviso.municipio}, Portugal`],
    [chaveFallback, `${aviso.municipio}, Portugal`],
  ] as const) {
    const emCache = cache.get(chave);
    if (emCache) return emCache;

    // Mesmo limite de 2 pedidos/segundo da LocationIQ que a sincronização
    // da E-Redes já respeita (ver eredes-sync.ts) — só entra aqui para
    // chaves nunca vistas (ver pré-carregamento da cache guardada).
    await new Promise((r) => setTimeout(r, 1100));
    const resultado = await geocodificarLocalidade(consulta);
    if (!resultado) continue;

    cache.set(chave, { lat: resultado.latitude, lon: resultado.longitude });
    const { error } = await supabase.from("geocodificacao_localidade").upsert({
      chave,
      latitude: resultado.latitude,
      longitude: resultado.longitude,
    });
    if (error) {
      console.warn(`[tejo-ambiente-sync] não consegui guardar a cache de geocodificação para "${chave}"`, error);
    }
    return { lat: resultado.latitude, lon: resultado.longitude };
  }

  // Nem o lugar específico nem o concelho sozinho deram resultado — sem
  // coordenadas não há pin possível, a entrada é ignorada (ver chamador).
  return null;
}

async function prepararAlerta(
  aviso: AvisoTejoAmbiente,
  cache: CacheGeocodificacao,
  supabase: SupabaseServiceClient
): Promise<AlertaAguaPreparado | null> {
  if (!aviso.ot) {
    console.warn("[tejo-ambiente-sync] aviso sem OT (identificador estável) — a ignorar", aviso);
    return null;
  }

  const dataInicio = horaTejoAmbienteParaTimestamptz(aviso.horaInicio);
  if (!dataInicio) {
    console.warn("[tejo-ambiente-sync] aviso sem hora de início reconhecível — a ignorar", aviso);
    return null;
  }
  const dataFim = horaTejoAmbienteParaTimestamptz(aviso.horaFim);

  const coordenadas = await geocodificar(aviso, cache, supabase);
  if (!coordenadas) {
    console.warn(`[tejo-ambiente-sync] não consegui geocodificar "${aviso.localidades}, ${aviso.municipio}" — a ignorar`, aviso);
    return null;
  }

  return {
    external_id: `tejoambiente:${aviso.ot}`,
    tipo_servico: "agua",
    concelho: aviso.municipio,
    freguesia: aviso.localidades || null,
    latitude: coordenadas.lat,
    longitude: coordenadas.lon,
    descricao: aviso.descricao || null,
    origem: "oficial",
    data_inicio: dataInicio,
    data_fim: dataFim,
    // Explícito de propósito, mesma razão que em eredes-sync.ts: sem isto
    // o upsert nunca reafirma "ativo" num conflito, e uma linha resolvida
    // por engano (moderação manual, bug futuro) ficaria resolvida para
    // sempre mesmo a fonte continuando a publicá-la.
    status: "ativo",
  };
}

interface AlertaExistenteResumo {
  id: string;
  external_id: string;
  data_inicio: string | null;
  data_fim: string | null;
}

/** Mesma lógica de "Corrigido" que eredes-sync.ts — ver lá o porquê de não ser partilhada. */
async function registarAlteracoes(supabase: SupabaseServiceClient, lote: AlertaAguaPreparado[]): Promise<void> {
  const { data: existentes, error } = await supabase
    .from("alertas")
    .select("id, external_id, data_inicio, data_fim")
    .in("external_id", lote.map((a) => a.external_id));
  if (error) {
    console.warn("[tejo-ambiente-sync] não consegui verificar alterações de horário antes do upsert", error);
    return;
  }

  const porExternalId = new Map((existentes as AlertaExistenteResumo[] | null ?? []).map((e) => [e.external_id, e]));
  const entradas: { alerta_id: string; campo: string; valor_anterior: string; valor_novo: string }[] = [];

  for (const alerta of lote) {
    const existente = porExternalId.get(alerta.external_id);
    if (!existente) continue;
    for (const campo of ["data_inicio", "data_fim"] as const) {
      const anterior = existente[campo];
      const novo = alerta[campo];
      if (!anterior || !novo) continue;
      if (new Date(anterior).getTime() !== new Date(novo).getTime()) {
        entradas.push({ alerta_id: existente.id, campo, valor_anterior: anterior, valor_novo: novo });
      }
    }
  }

  if (entradas.length === 0) return;
  const { error: erroHistorico } = await supabase.from("alertas_historico").insert(entradas);
  if (erroHistorico) {
    console.warn("[tejo-ambiente-sync] não consegui gravar histórico de alterações", erroHistorico);
  }
}

export interface ResultadoSincronizacaoAgua {
  processados: number;
  inseridosOuAtualizados: number;
  ignorados: number;
}

/**
 * Sincroniza os avisos de falta de água da Tejo Ambiente
 * (https://tejoambiente.pt/faltas-de-agua-avisos/) com a tabela `alertas`.
 *
 * Ao contrário da E-Redes (ver eredes-sync.ts), não há aqui um passo de
 * "resolver por ausência": cada aviso já vem com a sua própria janela
 * [data_inicio, data_fim] ("Hora de início" / "Hora de restabelecimento
 * prevista"), e `calcularEstado()` (estado-alerta.ts) já trata qualquer
 * coisa com `data_fim` no passado como "inativo" automaticamente — não
 * precisa de a sincronização decidir isso. A limitação conhecida: só lê a
 * página 1 (os avisos mais recentes de cada secção); se a Tejo Ambiente
 * tiver mais avisos em simultâneo do que cabem na página 1, os mais antigos
 * só desaparecem daqui quando o seu `data_fim` passar, não quando saem da
 * página 1 — aceitável à escala atual (poucos avisos em simultâneo),
 * documentado em vez de resolvido com paginação que ainda não foi pedida.
 */
export async function sincronizarTejoAmbiente(): Promise<ResultadoSincronizacaoAgua> {
  const supabase = getSupabaseServiceClient();
  const cache: CacheGeocodificacao = new Map();

  const { data: cacheGuardada, error: erroCacheGuardada } = await supabase
    .from("geocodificacao_localidade")
    .select("chave, latitude, longitude");
  if (erroCacheGuardada) {
    console.warn("[tejo-ambiente-sync] não consegui carregar a cache de geocodificação guardada", erroCacheGuardada);
  }
  for (const linha of cacheGuardada ?? []) {
    cache.set(linha.chave, { lat: linha.latitude, lon: linha.longitude });
  }

  const res = await fetch(URL_AVISOS, {
    headers: { "User-Agent": "FoiAbaixo/1.0 (+https://foiabaixo.vercel.app)" },
  });
  if (!res.ok) {
    throw new Error(`[tejo-ambiente-sync] tejoambiente.pt devolveu ${res.status}`);
  }
  const html = await res.text();

  const avisos = extrairAvisosTejoAmbiente(html).filter((a) => a.corteDeAbastecimento);

  const TAMANHO_LOTE = 50;
  let lote: AlertaAguaPreparado[] = [];
  let ignorados = 0;
  let inseridosOuAtualizados = 0;

  async function gravarLote() {
    if (lote.length === 0) return;
    await registarAlteracoes(supabase, lote);
    const { error, count } = await supabase
      .from("alertas")
      .upsert(lote, { onConflict: "external_id", count: "exact" });
    if (error) {
      console.warn(`[tejo-ambiente-sync] não consegui gravar um lote de ${lote.length} alertas`, error);
    } else {
      inseridosOuAtualizados += count ?? lote.length;
    }
    lote = [];
  }

  for (const aviso of avisos) {
    const alerta = await prepararAlerta(aviso, cache, supabase);
    if (!alerta) {
      ignorados++;
      continue;
    }
    lote.push(alerta);
    if (lote.length >= TAMANHO_LOTE) await gravarLote();
  }
  await gravarLote();

  return { processados: avisos.length, inseridosOuAtualizados, ignorados };
}
