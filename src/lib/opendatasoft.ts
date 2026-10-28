/**
 * Cliente genérico para a Explore API v2.1 da Opendatasoft — é a mesma API
 * usada por qualquer portal construído nesta plataforma, incluindo o da
 * E-Redes (e-redes.opendatasoft.com). Não é específico de nenhum dataset.
 */

const BASE_URL = "https://e-redes.opendatasoft.com/api/explore/v2.1";

export interface RegistoOpendatasoft {
  [campo: string]: unknown;
}

interface RespostaRegistos {
  total_count: number;
  results: RegistoOpendatasoft[];
}

/**
 * Pagina um dataset inteiro (até `limiteTotal` registos). A API pagina
 * em blocos de `tamanhoPagina` (máx. 100 por pedido na v2.1).
 */
export async function obterTodosOsRegistos(
  datasetId: string,
  { limiteTotal = 1000, tamanhoPagina = 100 }: { limiteTotal?: number; tamanhoPagina?: number } = {}
): Promise<RegistoOpendatasoft[]> {
  const registos: RegistoOpendatasoft[] = [];
  let offset = 0;

  while (registos.length < limiteTotal) {
    const url = new URL(`${BASE_URL}/catalog/datasets/${datasetId}/records`);
    url.searchParams.set("limit", String(Math.min(tamanhoPagina, limiteTotal - registos.length)));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Opendatasoft (${datasetId}) devolveu ${res.status}: ${await res.text()}`);
    }

    const pagina = (await res.json()) as RespostaRegistos;
    registos.push(...pagina.results);

    if (pagina.results.length < tamanhoPagina || registos.length >= pagina.total_count) break;
    offset += tamanhoPagina;
  }

  return registos;
}
