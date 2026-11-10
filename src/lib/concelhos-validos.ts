import { readFileSync } from "fs";
import { join } from "path";

/**
 * Lista + caixa delimitadora (bounding box) dos 308 concelhos reais, para
 * validar reportes da comunidade — sem isto, qualquer string serve de
 * "concelho" (já aconteceu "Desconhecido" e "Oceano Atlântico"), e mesmo
 * com o nome certo, nada impedia um ponto em Espanha ser aceite como
 * "Braga" (já aconteceu também, coordenadas perto de Lugo/Galiza).
 * Reaproveita o mesmo ficheiro que o mapa por concelhos já usa, para nunca
 * haver duas listas a poderem desalinhar.
 *
 * Lido do disco em vez de `import` — o tsconfig do projeto não inclui
 * `.geojson` no `include`, por isso `import` falha a resolver o módulo;
 * ler como ficheiro de texto evita essa limitação sem mexer no tsconfig.
 *
 * Caixa delimitadora, não o polígono exato de propósito: é muito mais
 * barato de calcular e verificar, e com uma margem generosa (~15km) nunca
 * rejeita à toa um reporte genuíno perto de uma fronteira entre
 * concelhos — só apanha disparates claros como um ponto no país vizinho.
 * Uma verificação ponto-no-polígono exata ficaria para depois, só se isto
 * se mostrar insuficiente na prática.
 */
function normalizar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

type Geometria =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

interface FeatureConcelho {
  properties: { con_name: string };
  geometry: Geometria;
}

interface CaixaDelimitadora {
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
}

/** ~15km de margem em graus (aproximação — não precisa de ser exata, é só uma folga generosa). */
const MARGEM_GRAUS = 0.15;

function calcularCaixa(geometria: Geometria): CaixaDelimitadora {
  let lonMin = Infinity;
  let lonMax = -Infinity;
  let latMin = Infinity;
  let latMax = -Infinity;

  // Polygon: number[][][] (anéis de [lon, lat]); MultiPolygon: number[][][][] (polígonos de anéis).
  const poligonos: number[][][][] = geometria.type === "Polygon" ? [geometria.coordinates] : geometria.coordinates;

  for (const poligono of poligonos) {
    for (const anel of poligono) {
      for (const [lon, lat] of anel) {
        if (lon < lonMin) lonMin = lon;
        if (lon > lonMax) lonMax = lon;
        if (lat < latMin) latMin = lat;
        if (lat > latMax) latMax = lat;
      }
    }
  }

  return {
    lonMin: lonMin - MARGEM_GRAUS,
    lonMax: lonMax + MARGEM_GRAUS,
    latMin: latMin - MARGEM_GRAUS,
    latMax: latMax + MARGEM_GRAUS,
  };
}

const CAIXAS_POR_CONCELHO: Map<string, CaixaDelimitadora> = (() => {
  const caminho = join(process.cwd(), "public", "data", "concelhos.geojson");
  const geojson = JSON.parse(readFileSync(caminho, "utf-8")) as { features: FeatureConcelho[] };
  const mapa = new Map<string, CaixaDelimitadora>();
  for (const feature of geojson.features) {
    mapa.set(normalizar(feature.properties.con_name), calcularCaixa(feature.geometry));
  }
  return mapa;
})();

export function ehConcelhoValido(nome: string): boolean {
  return CAIXAS_POR_CONCELHO.has(normalizar(nome));
}

/**
 * `null` se o concelho nem sequer for válido (ver `ehConcelhoValido`
 * primeiro); caso contrário diz se o ponto cai dentro da caixa delimitadora
 * do concelho indicado (com margem).
 */
export function estaDentroDoConcelho(nomeConcelho: string, latitude: number, longitude: number): boolean | null {
  const caixa = CAIXAS_POR_CONCELHO.get(normalizar(nomeConcelho));
  if (!caixa) return null;
  return (
    latitude >= caixa.latMin && latitude <= caixa.latMax && longitude >= caixa.lonMin && longitude <= caixa.lonMax
  );
}
