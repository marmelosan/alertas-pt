import { createHash } from "crypto";
import { obterTodosOsRegistos, type RegistoOpendatasoft } from "@/lib/opendatasoft";
import { geocodificarCodigoPostal } from "@/lib/geo";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

/**
 * ⚠️ MAPEAMENTO POR CONFIRMAR
 *
 * Não consegui aceder à API real da E-Redes a partir deste ambiente (rede
 * bloqueada no sandbox de desenvolvimento), por isso não sei os nomes
 * exatos dos campos dos datasets `outages-per-geography` (avarias ativas)
 * e `network-scheduling-work` (cortes programados).
 *
 * Em vez de inventar nomes e fingir que estão certos, listo aqui vários
 * candidatos plausíveis por campo lógico (nomes comuns em datasets
 * Opendatasoft portugueses). Na primeira sincronização real, cada registo
 * sem correspondência é registado via console.warn com o JSON em bruto —
 * corre uma vez com acesso à rede, vê os logs, e ajusta os arrays de
 * candidatos abaixo para os nomes reais.
 */
const CAMPOS_CANDIDATOS = {
  id: ["id", "record_id", "objectid", "identificador"],
  codigoPostal: ["codigo_postal", "cp", "cp7", "postal_code", "postalcode", "zipcode"],
  dataInicio: ["data_inicio", "data_hora_inicio", "start_date", "start_datetime", "dtinicio"],
  dataFim: ["data_fim", "data_hora_fim", "end_date", "end_datetime", "dtfim"],
  concelho: ["concelho", "municipio", "county", "municipality"],
  freguesia: ["freguesia", "parish"],
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

function gerarExternalId(datasetId: string, registo: RegistoOpendatasoft): string {
  const idBruto = obterCampo(registo, CAMPOS_CANDIDATOS.id);
  const base = idBruto !== undefined ? String(idBruto) : JSON.stringify(registo);
  return createHash("sha1").update(`${datasetId}:${base}`).digest("hex");
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
}

async function prepararAlerta(
  datasetId: string,
  registo: RegistoOpendatasoft,
  cacheGeocodificacao: Map<string, { lat: number; lon: number; concelho: string; freguesia: string | null }>
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
      // respeita o limite de ~1 pedido/segundo da Nominatim
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
    }
  } else {
    console.warn(
      `[eredes-sync] registo sem código postal nem geo_point_2d reconhecível — schema por confirmar. Registo em bruto:`,
      registo
    );
    return null;
  }

  const dataInicio = obterCampo(registo, CAMPOS_CANDIDATOS.dataInicio);
  const dataFim = obterCampo(registo, CAMPOS_CANDIDATOS.dataFim);
  const descricaoPartes = [
    datasetId === "network-scheduling-work" ? "Corte programado" : "Avaria ativa",
    dataInicio ? `desde ${dataInicio}` : null,
    dataFim ? `até ${dataFim}` : null,
  ].filter(Boolean);

  return {
    external_id: gerarExternalId(datasetId, registo),
    tipo_servico: "luz",
    concelho,
    freguesia,
    latitude: lat,
    longitude: lon,
    descricao: descricaoPartes.join(" ") || null,
    origem: "oficial",
  };
}

export interface ResultadoSincronizacao {
  processados: number;
  inseridosOuAtualizados: number;
  ignoradosPorFaltaDeSchema: number;
  resolvidosPorAusencia: number;
}

/**
 * Sincroniza os datasets da E-Redes (avarias ativas + cortes programados)
 * com a tabela `alertas`. Idempotente: usa `external_id` para upsert.
 * Alertas de origem "oficial" que já não aparecem nesta sincronização
 * (ou seja, a E-Redes deixou de os reportar como ativos) são marcados
 * como resolvidos — é a fonte oficial a dizer o estado atual, não um
 * temporizador.
 */
export async function sincronizarEredes(): Promise<ResultadoSincronizacao> {
  const supabase = getSupabaseServiceClient();
  const cacheGeocodificacao = new Map<
    string,
    { lat: number; lon: number; concelho: string; freguesia: string | null }
  >();

  const datasets = ["outages-per-geography", "network-scheduling-work"];
  const preparados: AlertaOficialPreparado[] = [];
  let processados = 0;
  let ignorados = 0;

  for (const datasetId of datasets) {
    const registos = await obterTodosOsRegistos(datasetId, { limiteTotal: 500 });
    processados += registos.length;

    for (const registo of registos) {
      const alerta = await prepararAlerta(datasetId, registo, cacheGeocodificacao);
      if (alerta) preparados.push(alerta);
      else ignorados++;
    }
  }

  let inseridosOuAtualizados = 0;
  if (preparados.length > 0) {
    const { error, count } = await supabase
      .from("alertas")
      .upsert(preparados, { onConflict: "external_id", count: "exact" });

    if (error) throw error;
    inseridosOuAtualizados = count ?? preparados.length;
  }

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
