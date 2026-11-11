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

interface ConcelhoCarregado {
  nomeOficial: string;
  caixa: CaixaDelimitadora;
  geometria: Geometria;
}

const CONCELHOS: Map<string, ConcelhoCarregado> = (() => {
  const caminho = join(process.cwd(), "public", "data", "concelhos.geojson");
  const geojson = JSON.parse(readFileSync(caminho, "utf-8")) as { features: FeatureConcelho[] };
  const mapa = new Map<string, ConcelhoCarregado>();
  for (const feature of geojson.features) {
    mapa.set(normalizar(feature.properties.con_name), {
      nomeOficial: feature.properties.con_name,
      caixa: calcularCaixa(feature.geometry),
      geometria: feature.geometry,
    });
  }
  return mapa;
})();

export function ehConcelhoValido(nome: string): boolean {
  return CONCELHOS.has(normalizar(nome));
}

function pontoNoAnel(latitude: number, longitude: number, anel: number[][]): boolean {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [loni, lati] = anel[i];
    const [lonj, latj] = anel[j];
    const atravessa =
      lati > latitude !== latj > latitude &&
      longitude < ((lonj - loni) * (latitude - lati)) / (latj - lati) + loni;
    if (atravessa) dentro = !dentro;
  }
  return dentro;
}

/** Um polígono (lista de anéis: o primeiro é o contorno, os restantes são buracos a excluir). */
function pontoNoPoligono(latitude: number, longitude: number, poligono: number[][][]): boolean {
  if (!pontoNoAnel(latitude, longitude, poligono[0])) return false;
  for (let i = 1; i < poligono.length; i++) {
    if (pontoNoAnel(latitude, longitude, poligono[i])) return false;
  }
  return true;
}

function pontoNaGeometria(latitude: number, longitude: number, geometria: Geometria): boolean {
  const poligonos: number[][][][] = geometria.type === "Polygon" ? [geometria.coordinates] : geometria.coordinates;
  return poligonos.some((poligono) => pontoNoPoligono(latitude, longitude, poligono));
}

/**
 * Qual concelho (dos 308) contém mesmo este ponto, por polígono exato (não
 * a caixa com margem usada em `estaDentroDoConcelho` — aqui queremos
 * precisão, não tolerância). `null` se o ponto não cair em nenhum (ex.:
 * já em Espanha, ou Açores/Madeira, que este ficheiro não cobre).
 *
 * Usado para corrigir o nome do concelho quando a E-Redes devolve uma
 * localidade/freguesia nesse campo em vez do concelho oficial (ex.:
 * "Ericeira" em vez de "Mafra") — já temos as coordenadas do registo,
 * por isso dá para resolver sem nenhuma chamada de rede extra.
 */
export function concelhoPorCoordenadas(latitude: number, longitude: number): string | null {
  for (const { nomeOficial, geometria } of CONCELHOS.values()) {
    if (pontoNaGeometria(latitude, longitude, geometria)) return nomeOficial;
  }
  return null;
}

/**
 * `null` se o concelho nem sequer for válido (ver `ehConcelhoValido`
 * primeiro); caso contrário diz se o ponto cai dentro da caixa delimitadora
 * do concelho indicado (com margem).
 */
export function estaDentroDoConcelho(nomeConcelho: string, latitude: number, longitude: number): boolean | null {
  const concelho = CONCELHOS.get(normalizar(nomeConcelho));
  if (!concelho) return null;
  const { caixa } = concelho;
  return (
    latitude >= caixa.latMin && latitude <= caixa.latMax && longitude >= caixa.lonMin && longitude <= caixa.lonMax
  );
}
