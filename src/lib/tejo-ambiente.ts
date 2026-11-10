/**
 * Bloco 13 — parser dos avisos de falta de água da Tejo Ambiente
 * (https://tejoambiente.pt/faltas-de-agua-avisos/), confirmado contra HTML
 * real da página (não adivinhado): duas secções ("NÃO PROGRAMADAS" e
 * "PROGRAMADAS"), cada uma com vários painéis Bootstrap-collapse, cada
 * painel com uma tabela de campos fixos (Descrição, Data, Programada?,
 * Corte de abastecimento, Município, Localidades / Locais Afetados,
 * Data/Hora de comunicação de avaria, Hora de início, Hora de
 * restabelecimento prevista, OT).
 *
 * Sem biblioteca de DOM (não há cheerio/jsdom no projeto) — regex
 * tolerante em vez disso, porque a estrutura real tem duas variantes
 * (tabela "suja" exportada do Word nas não programadas, tabela limpa nas
 * programadas) e só precisamos de pares <td>/<td> dentro de cada <tr>,
 * nunca de perceber a árvore completa.
 */

export interface AvisoTejoAmbiente {
  titulo: string;
  href: string;
  descricao: string;
  data: string;
  programada: boolean;
  corteDeAbastecimento: boolean;
  municipio: string;
  localidades: string;
  /** Formato bruto da fonte: "DD.MM.YYYY – HH:MMh". */
  horaInicio: string | null;
  horaFim: string | null;
  /** Normalizado (sem espaços a mais) — ex.: "OT_ 95202" e "OT_96294" tornam-se "OT_95202"/"OT_96294". */
  ot: string | null;
}

const ENTIDADES_NOMEADAS: Record<string, string> = {
  amp: "&",
  nbsp: " ",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  atilde: "ã",
  otilde: "õ",
  ccedil: "ç",
  oacute: "ó",
  iacute: "í",
  aacute: "á",
  uacute: "ú",
  agrave: "à",
  acirc: "â",
  ocirc: "ô",
  ntilde: "ñ",
  ordf: "ª",
  ordm: "º",
  hellip: "…",
  rsaquo: "›",
  lsaquo: "‹",
  laquo: "«",
  raquo: "»",
  quot: '"',
  apos: "'",
};

function decodificarEntidades(txt: string): string {
  return txt
    .replace(/&#(\d+);/g, (_, cod: string) => String.fromCodePoint(Number(cod)))
    .replace(/&([a-zA-Z]+);/g, (m, nome: string) => ENTIDADES_NOMEADAS[nome] ?? m);
}

function limparTexto(html: string): string {
  const semTags = html.replace(/<[^>]*>/g, " ");
  return decodificarEntidades(semTags).replace(/\s+/g, " ").trim();
}

function extrairCampos(blocoHtml: string): Record<string, string> {
  const campos: Record<string, string> = {};
  const linhas = blocoHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? [];
  for (const linha of linhas) {
    const tds = linha.match(/<td[^>]*>[\s\S]*?<\/td>/g) ?? [];
    if (tds.length < 2 || tds[0] === undefined || tds[1] === undefined) continue;
    const rotulo = limparTexto(tds[0]);
    const valor = limparTexto(tds[1]);
    if (rotulo) campos[rotulo] = valor;
  }
  return campos;
}

function normalizarOT(bruto: string): string {
  const digitos = bruto.match(/\d+/);
  return digitos ? `OT_${digitos[0]}` : bruto.replace(/\s+/g, "");
}

function extrairAvisosDeSecao(secaoHtml: string): AvisoTejoAmbiente[] {
  const avisos: AvisoTejoAmbiente[] = [];
  const regexTitulo = /<a class="panel-title"[^>]*href='([^']*)'[^>]*>([\s\S]*?)<\/a>/g;
  const titulos: { href: string; titulo: string; inicioConteudo: number; indice: number }[] = [];

  let m: RegExpExecArray | null;
  while ((m = regexTitulo.exec(secaoHtml))) {
    titulos.push({ href: m[1], titulo: limparTexto(m[2]), indice: m.index, inicioConteudo: regexTitulo.lastIndex });
  }

  for (let i = 0; i < titulos.length; i++) {
    const inicio = titulos[i].inicioConteudo;
    const fim = i + 1 < titulos.length ? titulos[i + 1].indice : secaoHtml.length;
    const campos = extrairCampos(secaoHtml.slice(inicio, fim));
    if (Object.keys(campos).length === 0) continue;

    const otBruto = campos["OT"];
    avisos.push({
      titulo: titulos[i].titulo,
      href: titulos[i].href,
      descricao: campos["Descrição"] ?? titulos[i].titulo,
      data: campos["Data"] ?? "",
      programada: (campos["Programada?"] ?? "").toLowerCase() === "sim",
      corteDeAbastecimento: (campos["Corte de abastecimento"] ?? "").toLowerCase() === "sim",
      municipio: campos["Município"] ?? "",
      localidades: campos["Localidades / Locais Afetados"] ?? "",
      horaInicio: campos["Hora de início"] || null,
      horaFim: campos["Hora de restabelecimento prevista"] || null,
      ot: otBruto ? normalizarOT(otBruto) : null,
    });
  }

  return avisos;
}

/**
 * As duas secções vivem na mesma página — procuramos o marcador exato da
 * segunda ("PROGRAMADAS</strong>", sem "NÃO" à frente) para dividir; tudo
 * antes disso é "Não Programadas", tudo a partir daí é "Programadas". Se o
 * marcador não existir (página mudou), tratamos a página toda como uma só
 * secção em vez de rebentar.
 */
export function extrairAvisosTejoAmbiente(html: string): AvisoTejoAmbiente[] {
  const indice = html.indexOf("<strong>PROGRAMADAS</strong>");
  if (indice === -1) return extrairAvisosDeSecao(html);
  return [...extrairAvisosDeSecao(html.slice(0, indice)), ...extrairAvisosDeSecao(html.slice(indice))];
}

function desvioHorarioLisboa(instanteAproximado: Date): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Lisbon",
    timeZoneName: "shortOffset",
  }).formatToParts(instanteAproximado);
  const nomeFuso = partes.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = nomeFuso.match(/GMT([+-]\d+)/);
  return match ? Number(match[1]) * 60 : 0;
}

/**
 * Formato da Tejo Ambiente: "08.11.2026 – 14:15h" (dia.mês.ano – hora:minutoh).
 * Mesma lógica de deteção de WET/WEST que a sincronização da E-Redes
 * (eredes-sync.ts) — duplicada aqui de propósito em vez de partilhada: são
 * 10 linhas autocontidas, e eredes-sync.ts é código de produção estável
 * que não vale a pena arriscar só para poupar essa duplicação.
 */
export function horaTejoAmbienteParaTimestamptz(valor: string | null): string | null {
  if (!valor) return null;
  const m = valor.match(/(\d{2})\.(\d{2})\.(\d{4})\s*[–-]\s*(\d{2}):(\d{2})h?/);
  if (!m) return null;
  const [, dia, mes, ano, hora, minuto] = m;
  const aproximado = new Date(`${ano}-${mes}-${dia}T${hora}:${minuto}:00Z`);
  if (Number.isNaN(aproximado.getTime())) return null;
  const desvioMin = desvioHorarioLisboa(aproximado);
  return new Date(aproximado.getTime() - desvioMin * 60000).toISOString();
}
