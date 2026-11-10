/**
 * Bloco 14, Passo 1 — de onde vem cada alerta oficial, num só sítio para
 * não desalinhar entre o mapa da home, o mapa por concelho, o painel de
 * recentes e a página de concelho.
 *
 * Água tem uma entidade gestora por concelho (ao contrário da luz, onde é
 * sempre a E-Redes) — por isso o mapeamento é por concelho, não um valor
 * único. Só entra aqui quem já tem adaptador de sincronização a sério
 * (Bloco 13, ver tejo-ambiente-sync.ts); um concelho de água oficial sem
 * fonte aqui mostra "Oficial" sem link, nunca atribuído à entidade errada.
 */
export interface FonteOficial {
  nome: string;
  link: string;
}

const FONTE_EREDES: FonteOficial = {
  nome: "Oficial E-REDES",
  link: "https://e-redes.opendatasoft.com/explore/dataset/network-scheduling-work/information/",
};

const FONTE_TEJO_AMBIENTE: FonteOficial = {
  nome: "Oficial Tejo Ambiente",
  link: "https://tejoambiente.pt/faltas-de-agua-avisos/",
};

/** Só concelhos confirmados por avisos reais da Tejo Ambiente (ver tejo-ambiente-sync.ts) — nunca adivinhados. */
const FONTES_AGUA_POR_CONCELHO: Record<string, FonteOficial> = {
  Sardoal: FONTE_TEJO_AMBIENTE,
  "Ferreira do Zêzere": FONTE_TEJO_AMBIENTE,
  "Vila Nova da Barquinha": FONTE_TEJO_AMBIENTE,
};

/** `null` quando é água oficial mas o concelho ainda não tem adaptador — a UI mostra "Oficial" sem link, nunca E-REDES. */
export function obterFonteOficial(alerta: { tipo_servico: "agua" | "luz"; concelho: string }): FonteOficial | null {
  if (alerta.tipo_servico === "luz") return FONTE_EREDES;
  return FONTES_AGUA_POR_CONCELHO[alerta.concelho] ?? null;
}
