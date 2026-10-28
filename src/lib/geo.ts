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

export interface LocalizacaoPorCodigoPostal extends LocalizacaoAproximada {
  latitude: number;
  longitude: number;
}

/**
 * Geocodificação direta a partir de um código postal português (via
 * Nominatim). Usada pela sincronização da E-Redes, cujos dados vêm
 * organizados por código postal, não por coordenadas.
 *
 * Nota: a política de uso da Nominatim pede no máximo 1 pedido/segundo —
 * quem chamar isto em lote (ex.: o job de sincronização) tem de espaçar
 * as chamadas, não é responsabilidade desta função.
 */
export async function geocodificarCodigoPostal(
  codigoPostal: string
): Promise<LocalizacaoPorCodigoPostal | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("postalcode", codigoPostal);
  url.searchParams.set("country", "Portugal");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, { headers: { "Accept-Language": "pt-PT" } });
  if (!res.ok) throw new Error(`Nominatim devolveu ${res.status}`);

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
