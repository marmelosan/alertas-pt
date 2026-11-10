import { readFileSync } from "fs";
import { join } from "path";

/**
 * Lista dos 308 concelhos reais, para validar reportes da comunidade — sem
 * isto, qualquer string serve de "concelho" (incluindo "Desconhecido" ou,
 * como aconteceu em produção, "Oceano Atlântico", quando a geocodificação
 * reversa do cliente devolve lixo para um ponto fora de terra). Reaproveita
 * o mesmo ficheiro que o mapa por concelhos já usa, para nunca haver duas
 * listas a poderem desalinhar.
 *
 * Lido do disco em vez de `import` — o tsconfig do projeto não inclui
 * `.geojson` no `include`, por isso `import` falha a resolver o módulo;
 * ler como ficheiro de texto evita essa limitação sem mexer no tsconfig.
 *
 * Normalizado (sem acentos, minúsculas) para aceitar pequenas variações de
 * acentuação/maiúsculas sem rejeitar reportes válidos à toa.
 */
function normalizar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

interface FeatureConcelho {
  properties: { con_name: string };
}

const NOMES_VALIDOS: Set<string> = (() => {
  const caminho = join(process.cwd(), "public", "data", "concelhos.geojson");
  const geojson = JSON.parse(readFileSync(caminho, "utf-8")) as { features: FeatureConcelho[] };
  return new Set(geojson.features.map((f) => normalizar(f.properties.con_name)));
})();

export function ehConcelhoValido(nome: string): boolean {
  return NOMES_VALIDOS.has(normalizar(nome));
}
