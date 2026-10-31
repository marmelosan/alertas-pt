export interface LocalizacaoAproximada {
  concelho: string;
  freguesia: string | null;
}

/**
 * Geocodificação inversa via Nominatim (OpenStreetMap, gratuito, sem chave).
 * O mapeamento concelho/freguesia é aproximado: a hierarquia administrativa
 * do Nominatim não corresponde 1:1 à divisão portuguesa, por isso isto serve
 * para pré-preencher o formulário — o utilizador pode sempre corrigir.
 */
export async function geocodificarInverso(
  latitude: number,
  longitude: number
): Promise<LocalizacaoAproximada> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "14");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, {
    headers: {
      // Nominatim pede um User-Agent/Referer identificável para uso não-comercial
      "Accept-Language": "pt-PT",
    },
  });

  if (!res.ok) {
    throw new Error(`Nominatim devolveu ${res.status}`);
  }

  const data = await res.json();
  const address = data.address ?? {};

  const concelho: string =
    address.county || address.city || address.town || address.municipality || "Desconhecido";

  const freguesia: string | null =
    address.suburb || address.city_district || address.village || null;

  return { concelho, freguesia };
}

export interface ResultadoBusca {
  nome: string;
  latitude: number;
  longitude: number;
}

/**
 * Pesquisa de texto livre (nome de concelho/freguesia/vila) via Nominatim,
 * restrita a Portugal. Usada pela caixa de busca do mapa — a forma mais
 * rápida de alguém encontrar a sua zona sem ter de andar a fazer zoom à mão.
 */
export async function pesquisarLocais(termo: string): Promise<ResultadoBusca[]> {
  if (termo.trim().length < 2) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", termo);
  url.searchParams.set("countrycodes", "pt");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");

  const res = await fetch(url, { headers: { "Accept-Language": "pt-PT" } });
  if (!res.ok) throw new Error(`Nominatim devolveu ${res.status}`);

  const resultados = await res.json();
  return (resultados as Array<{ display_name: string; lat: string; lon: string }>).map((r) => ({
    nome: r.display_name,
    latitude: Number(r.lat),
    longitude: Number(r.lon),
  }));
}

export interface LocalizacaoPorCodigoPostal extends LocalizacaoAproximada {
  latitude: number;
  longitude: number;
}

/**
 * Geocodificação direta a partir de um código postal português — usada
 * pela sincronização da E-Redes, cujos dados vêm organizados por código
 * postal, não por coordenadas. Chamada do lado do servidor: usa o
 * LocationIQ em vez da Nominatim pública, que bloqueia com 403 os IPs
 * partilhados de serviços cloud como a Vercel/GitHub Actions (mesmo com
 * um User-Agent identificável). Mesma origem de dados (OpenStreetMap) e
 * formato de pedido/resposta compatível — só muda o endpoint e a chave.
 *
 * Nota: a política de uso da LocationIQ também pede no máximo 2
 * pedidos/segundo no plano grátis — quem chamar isto em lote (ex.: o job
 * de sincronização) tem de espaçar as chamadas, não é responsabilidade
 * desta função.
 */
export async function geocodificarCodigoPostal(
  codigoPostal: string
): Promise<LocalizacaoPorCodigoPostal | null> {
  const chave = process.env.LOCATIONIQ_API_KEY;
  if (!chave) {
    throw new Error("LOCATIONIQ_API_KEY em falta — ver .env.local.example");
  }

  // Pesquisa de texto livre (igual à usada em pesquisarLocais, que já
  // funciona) em vez de campos estruturados (postalcode+country) — o
  // LocationIQ rejeitou essa combinação com "Invalid Request" mesmo com um
  // código postal português válido.
  const url = new URL("https://us1.locationiq.com/v1/search");
  url.searchParams.set("key", chave);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", `${codigoPostal}, Portugal`);
  url.searchParams.set("countrycodes", "pt");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, { headers: { "Accept-Language": "pt-PT" } });
  if (res.status === 404) return null; // LocationIQ devolve 404 quando não encontra nada, não um array vazio
  if (!res.ok) {
    // Inclui o corpo da resposta no erro — o LocationIQ costuma explicar a
    // causa exata (ex.: chave inválida, parâmetro em falta), e sem isto só
    // se vê o número do status, o que torna impossível diagnosticar à
    // distância.
    const corpo = await res.text().catch(() => "");
    throw new Error(`LocationIQ devolveu ${res.status}: ${corpo}`);
  }

  const resultados = await res.json();
  const primeiro = resultados?.[0];
  if (!primeiro) return null;

  const address = primeiro.address ?? {};
  return {
    latitude: Number(primeiro.lat),
    longitude: Number(primeiro.lon),
    concelho: address.county || address.city || address.town || address.municipality || "Desconhecido",
    freguesia: address.suburb || address.city_district || address.village || null,
  };
}
