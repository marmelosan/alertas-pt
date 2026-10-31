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
  if (res.status === 404) return null; // LocationIQ devolve 404 quando não encontra nada, não um array vazio
  if (!res.ok) {
    // Inclui o corpo da resposta no erro — o LocationIQ costuma explicar a
    // causa exata (ex.: chave inválida, parâmetro em falta), e sem isto só
    // se vê o número do status, o que torna impossível diagnosticar à
    // distância.
    const corpo = await res.text().catch(() => "");
    throw new Error(`LocationIQ devolveu ${res.status}: ${corpo}`);
  }
