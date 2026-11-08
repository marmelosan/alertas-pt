import { createHash } from "crypto";
import { obterTodosOsRegistos, type RegistoOpendatasoft } from "@/lib/opendatasoft";
import { geocodificarCodigoPostal } from "@/lib/geo";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type SupabaseServiceClient = ReturnType<typeof getSupabaseServiceClient>;
type CacheGeocodificacao = Map<string, { lat: number; lon: number; concelho: string; freguesia: string | null }>;

/**
 * Mapeamento confirmado em 2026-10-29 contra a API real do dataset
 * `network-scheduling-work` (cortes programados): zipcode, municipality,
 * parish, startdatetime, enddatetime. Sem geo_point_2d — geocodificamos
 * sempre pelo código postal.
 *
 * O catálogo aberto da E-Redes (70 datasets, listados em 2026-10-29) não
 * tem nenhum dataset de avarias em tempo real — `outages-per-geography`
 * não existe e não há equivalente. A E-Redes só publica aqui os cortes
 * programados; avarias ao vivo ficam só a cargo dos reportes da
 * comunidade. `sincronizarEredes` sincroniza por isso só este dataset.
 */
const CAMPOS_CANDIDATOS = {
  id: ["id", "record_id", "objectid", "identificador"],
  codigoPostal: ["zipcode", "codigo_postal", "cp", "cp7", "postal_code", "postalcode"],
  dataInicio: ["startdatetime", "data_inicio", "data_hora_inicio", "start_date", "dtinicio"],
  dataFim: ["enddatetime", "data_fim", "data_hora_fim", "end_date", "dtfim"],
  concelho: ["municipality", "concelho", "municipio", "county"],
  freguesia: ["parish", "freguesia"],
} as const;

function obterCampo(registo: RegistoOpendatasoft, candidatos: readonly string[]): unknown {
  for (const chave of candidatos) {
    if (registo[chave] !== undefined && registo[chave] !== null && registo[chave] !== "") {
      return registo[chave];
    }
  }
  return undefined;
}

/** Campo padrão da Opendatasoft para datasets com localização — quando existe, poupa uma chamada ao Nominatim. */
function extrairGeoPoint(registo: RegistoOpendatasoft): { lat: number; lon: number } | null {
  const geo = registo["geo_point_2d"] as { lat?: number; lon?: number } | undefined;
  if (geo && typeof geo.lat === "number" && typeof geo.lon === "number") {
    return { lat: geo.lat, lon: geo.lon };
  }
  return null;
}

/**
 * A identidade de um registo tem de se basear só nos campos que descrevem
 * O EVENTO em si (onde + quando), nunca em campos como "updatedatetime"/
 * "data" que a E-Redes atualiza todos os dias mesmo para o mesmo corte —
 * usar o registo inteiro como base faria o upsert falhar (cada sync criava
 * uma linha nova em vez de atualizar a existente).
 */
function gerarExternalId(datasetId: string, registo: RegistoOpendatasoft): string {
  const idBruto = obterCampo(registo, CAMPOS_CANDIDATOS.id);
  if (idBruto !== undefined) {
    return createHash("sha1").update(`${datasetId}:${idBruto}`).digest("hex");
  }

  const codigoPostal = obterCampo(registo, CAMPOS_CANDIDATOS.codigoPostal);
  const dataInicio = obterCampo(registo, CAMPOS_CANDIDATOS.dataInicio);
  const dataFim = obterCampo(registo, CAMPOS_CANDIDATOS.dataFim);
  if (codigoPostal !== undefined && dataInicio !== undefined) {
    const base = `${codigoPostal}|${dataInicio}|${dataFim ?? ""}`;
    return createHash("sha1").update(`${datasetId}:${base}`).digest("hex");
  }

  return createHash("sha1").update(`${datasetId}:${JSON.stringify(registo)}`).digest("hex");
}

interface AlertaOficialPreparado {
  external_id: string;
  tipo_servico: "luz";
  concelho: string;
  freguesia: string | null;
  latitude: number;
  longitude: number;
  descricao: string | null;
  origem: "oficial";
  data_inicio: string | null;
  data_fim: string | null;
}

/**
 * Os timestamps da E-Redes vêm sem fuso horário explícito (ex.:
 * "2026-10-30T07:00:00") — assumimos hora de Lisboa. ⚠️ Por verificar: não
 * fazemos conversão de DST (verão/inverno); no inverno (WET = UTC+0)
 * coincide com UTC, no verão (WEST = UTC+1) pode ficar 1h adiantado. Dado
 * que isto só afeta a hora exata a que um corte aparece como "a começar"
 * (não o dia), fica assinalado para corrigir mais tarde em vez de
 * silenciosamente ignorado.
 */
function paraTimestamptz(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

async function prepararAlerta(
  datasetId: string,
  registo: RegistoOpendatasoft,
  cacheGeocodificacao: CacheGeocodificacao,
  supabase: SupabaseServiceClient
): Promise<AlertaOficialPreparado | null> {
  const codigoPostal = obterCampo(registo, CAMPOS_CANDIDATOS.codigoPostal);
  const geoPoint = extrairGeoPoint(registo);
  const concelhoBruto = obterCampo(registo, CAMPOS_CANDIDATOS.concelho);
  const freguesiaBruta = obterCampo(registo, CAMPOS_CANDIDATOS.freguesia);

  let lat: number, lon: number, concelho: string, freguesia: string | null;

  if (geoPoint && concelhoBruto) {
    lat = geoPoint.lat;
    lon = geoPoint.lon;
    concelho = String(concelhoBruto);
    freguesia = freguesiaBruta ? String(freguesiaBruta) : null;
  } else if (typeof codigoPostal === "string") {
    const cacheHit = cacheGeocodificacao.get(codigoPostal);
    if (cacheHit) {
      ({ lat, lon, concelho, freguesia } = cacheHit);
    } else {
      // respeita o limite de pedidos/segundo do plano grátis da
      // LocationIQ — só entra aqui para códigos postais NUNCA vistos
      // antes (ver seedCacheDaBaseDeDados): a partir da primeira vez que
      // um código postal é geocodificado, fica guardado para sempre na
      // tabela geocodificacao_cp, por isso esta espera deixa de somar em
      // quase todas as sincronizações seguintes.
      await new Promise((r) => setTimeout(r, 1100));
      const loc = await geocodificarCodigoPostal(codigoPostal);
      if (!loc) {
        console.warn(`[eredes-sync] não consegui geocodificar o código postal "${codigoPostal}"`, registo);
        return null;
      }
      lat = loc.latitude;
      lon = loc.longitude;
      concelho = loc.concelho;
      freguesia = loc.freguesia;
      cacheGeocodificacao.set(codigoPostal, { lat, lon, concelho, freguesia });

      // Grava já, em vez de só no fim — se a função for interrompida por
      // timeout a meio de uma sincronização grande, o que já foi
      // geocodificado fica guardado e não se perde nem se repete na
      // próxima corrida.
      const { error: erroCache } = await supabase.from("geocodificacao_cp").upsert({
        codigo_postal: codigoPostal,
        latitude: lat,
        longitude: lon,
        concelho,
        freguesia,
      });
      if (erroCache) {
        console.warn(`[eredes-sync] não consegui guardar a cache do código postal "${codigoPostal}"`, erroCache);
      }
    }
  } else {
    console.warn(
      `[eredes-sync] registo sem código postal nem geo_point_2d reconhecível — schema por confirmar. Registo em bruto:`,
      registo
    );
    return null;
  }

  const dataInicio = paraTimestamptz(obterCampo(registo, CAMPOS_CANDIDATOS.dataInicio));
  const dataFim = paraTimestamptz(obterCampo(registo, CAMPOS_CANDIDATOS.dataFim));
  if (!dataInicio) {
    console.warn(`[eredes-sync] registo sem data de início reconhecível, a ignorar:`, registo);
    return null;
  }

  const descricaoPartes = [
    datasetId === "network-scheduling-work" ? "Corte programado" : "Avaria ativa",
    `desde ${dataInicio}`,
    dataFim ? `até ${dataFim}` : null,
  ].filter(Boolean);

  return {
    external_id: gerarExternalId(datasetId, registo),
    tipo_servico: "luz",
    concelho,
    freguesia,
    latitude: lat,
    longitude: lon,
    data_inicio: dataInicio,
    data_fim: dataFim,
    descricao: descricaoPartes.join(" ") || null,
    origem: "oficial",
  };
}

interface AlertaExistenteResumo {
  id: string;
  external_id: string;
  data_inicio: string | null;
  data_fim: string | null;
}

/**
 * Bloco 14, Passo 3 — antes de um upsert, compara data_inicio/data_fim com o
 * que já estava gravado e regista em `alertas_historico` o que mudou (ex.: a
 * E-Redes adiou um corte 1h). Só compara pelo valor do instante (não a
 * string), para não gerar "correções" falsas só por diferenças de formato
 * entre o que a BD devolve e o que acabámos de calcular com toISOString().
 * Ignora registos novos (sem linha existente) e campos que só passaram de
 * nulo para preenchido — isso é informação a chegar, não uma correção.
 */
async function registarAlteracoes(supabase: SupabaseServiceClient, lote: AlertaOficialPreparado[]): Promise<void> {
  const { data: existentes, error } = await supabase
    .from("alertas")
    .select("id, external_id, data_inicio, data_fim")
    .in("external_id", lote.map((a) => a.external_id));
  if (error) {
    console.warn("[eredes-sync] não consegui verificar alterações de horário antes do upsert", error);
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
    console.warn("[eredes-sync] não consegui gravar histórico de alterações", erroHistorico);
  }
}

export interface ResultadoSincronizacao {
  processados: number;
  inseridosOuAtualizados: number;
  ignoradosPorFaltaDeSchema: number;
  resolvidosPorAusencia: number;
}

/**
 * Sincroniza os cortes programados da E-Redes com a tabela `alertas`.
 * Idempotente: usa `external_id` para upsert. Alertas de origem "oficial"
 * que já não aparecem nesta sincronização (ou seja, a E-Redes deixou de os
 * reportar) são marcados como resolvidos — é a fonte oficial a dizer o
 * estado atual, não um temporizador.
 */
export async function sincronizarEredes(): Promise<ResultadoSincronizacao> {
  const supabase = getSupabaseServiceClient();
  const cacheGeocodificacao: CacheGeocodificacao = new Map();

  // Pré-carrega tudo o que já foi geocodificado em sincronizações
  // anteriores — é isto que evita voltar a pedir à LocationIQ um código
  // postal que já conhecemos, em vez de recomeçar do zero sempre.
  const { data: cacheGuardada, error: erroCacheGuardada } = await supabase
    .from("geocodificacao_cp")
    .select("codigo_postal, latitude, longitude, concelho, freguesia");
  if (erroCacheGuardada) {
    console.warn("[eredes-sync] não consegui carregar a cache de geocodificação guardada", erroCacheGuardada);
  }
  for (const linha of cacheGuardada ?? []) {
    cacheGeocodificacao.set(linha.codigo_postal, {
      lat: linha.latitude,
      lon: linha.longitude,
      concelho: linha.concelho,
      freguesia: linha.freguesia,
    });
  }

  const TAMANHO_LOTE = 50;

  const datasets = ["network-scheduling-work"];
  const preparados: AlertaOficialPreparado[] = [];
  let lote: AlertaOficialPreparado[] = [];
  let processados = 0;
  let ignorados = 0;
  let inseridosOuAtualizados = 0;

  async function gravarLote() {
    if (lote.length === 0) return;
    await registarAlteracoes(supabase, lote);
    const { error, count } = await supabase
      .from("alertas")
      .upsert(lote, { onConflict: "external_id", count: "exact" });
    if (error) {
      console.warn(`[eredes-sync] não consegui gravar um lote de ${lote.length} alertas`, error);
    } else {
      inseridosOuAtualizados += count ?? lote.length;
    }
    lote = [];
  }

  for (const datasetId of datasets) {
    // Sem limiteTotal de propósito: mais abaixo marcamos como "resolvido"
    // tudo o que não aparecer nesta resposta, por isso tem de ser o
    // dataset inteiro — um corte real só porque não coube num corte
    // artificial de registos (já aconteceu: ver commit da correção).
    const registos = await obterTodosOsRegistos(datasetId);
    processados += registos.length;

    for (const registo of registos) {
      const alerta = await prepararAlerta(datasetId, registo, cacheGeocodificacao, supabase);
      if (!alerta) {
        ignorados++;
        continue;
      }
      preparados.push(alerta);
      lote.push(alerta);

      // Grava em lotes de TAMANHO_LOTE, em vez de um a um (demasiadas
      // viagens de ida e volta à base de dados, mesmo sem nenhuma espera
      // de geocodificação pelo meio já chega aos 60s de limite da
      // Vercel com ~500 registos) nem só no fim do ciclo inteiro (perde-
      // se tudo se a função for cortada a meio). Um lote se perdido é
      // muito menos grave do que perder a sincronização toda.
      if (lote.length >= TAMANHO_LOTE) await gravarLote();
    }
  }
  await gravarLote();

  const idsAtuais = preparados.map((a) => a.external_id);
  const { data: resolvidos, error: erroResolver } = await supabase
    .from("alertas")
    .update({ status: "resolvido" })
    .eq("origem", "oficial")
    .eq("status", "ativo")
    .not("external_id", "in", `(${idsAtuais.map((id) => `"${id}"`).join(",") || "''"})`)
    .select("id");

  if (erroResolver) throw erroResolver;

  return {
    processados,
    inseridosOuAtualizados,
    ignoradosPorFaltaDeSchema: ignorados,
    resolvidosPorAusencia: resolvidos?.length ?? 0,
  };
}
