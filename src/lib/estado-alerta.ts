import type { Alerta } from "@/types/alerta";

export type EstadoAlerta = "ativo" | "por_confirmar" | "programado" | "inativo";

const JANELA_COMUNIDADE_HORAS = 24;

/**
 * Bloco 6 do briefing: proteção contra abuso. Um reporte sozinho da
 * comunidade não chega para aparecer como "ativo" — precisa de pelo menos
 * mais uma confirmação independente (botão "Eu também estou sem isto").
 * `contador_votos` já começa em 1 no momento do reporte (ver migração
 * 0001), por isso a 2ª confirmação real já perfaz as "2 reportes
 * independentes" pedidas. Antes disso fica "por_confirmar" — continua
 * visível no mapa (de outra forma ninguém o veria para o confirmar), só
 * não conta como falha confirmada nas contagens/estatísticas.
 */
const CONFIRMACOES_PARA_ATIVO = 2;

/**
 * Única fonte de verdade sobre o estado de um alerta — usada em todos os
 * sítios que antes liam só o campo `status` da base de dados (mapa, lista
 * de concelhos, página de concelho, painel de recentes).
 *
 * `status` continua a existir na base de dados (serve para moderação —
 * denúncias, resolução manual), mas não chega sozinho para decidir o
 * estado: um reporte da comunidade só é ativo nas primeiras 24h desde que
 * foi criado E com pelo menos 2 confirmações independentes; um corte
 * oficial da E-Redes só é ativo dentro da janela [data_inicio, data_fim]
 * — antes disso está "programado", depois está "inativo", mesmo que
 * ninguém tenha ainda atualizado o status na BD.
 */
export function calcularEstado(alerta: Alerta, agora: Date = new Date()): EstadoAlerta {
  if (alerta.status === "resolvido") return "inativo";

  if (alerta.origem === "oficial") {
    if (!alerta.data_inicio) return "inativo"; // sem dados suficientes da E-Redes, não assume ativo
    const inicio = new Date(alerta.data_inicio);
    if (agora < inicio) return "programado";
    if (alerta.data_fim && agora > new Date(alerta.data_fim)) return "inativo";
    return "ativo";
  }

  const horasDesdeCriacao = (agora.getTime() - new Date(alerta.criado_em).getTime()) / 36e5;
  if (horasDesdeCriacao > JANELA_COMUNIDADE_HORAS) return "inativo";
  return alerta.contador_votos >= CONFIRMACOES_PARA_ATIVO ? "ativo" : "por_confirmar";
}

export function estaAtivo(alerta: Alerta, agora: Date = new Date()): boolean {
  return calcularEstado(alerta, agora) === "ativo";
}

export function estaPorConfirmar(alerta: Alerta, agora: Date = new Date()): boolean {
  return calcularEstado(alerta, agora) === "por_confirmar";
}

/** Ativo OU por confirmar — os dois estados em que um reporte ainda merece aparecer no mapa agora. */
export function estaVisivelAgora(alerta: Alerta, agora: Date = new Date()): boolean {
  const estado = calcularEstado(alerta, agora);
  return estado === "ativo" || estado === "por_confirmar";
}

/**
 * Sem limite de dias de propósito — já houve duas voltas a isto (janela de
 * 7, depois 30) e continuava a cortar cortes genuinamente confirmados pela
 * E-Redes com mais de um mês de antecedência. Se já está na BD como
 * "programado", é porque a E-Redes já o confirmou; não há razão nenhuma
 * para o esconder nas vistas gerais (mapa, resumo da home, lista de
 * concelhos) só por estar a 20 ou 25 dias, principalmente quando a página
 * do próprio concelho sempre o mostrou sem limite nenhum.
 */
export function estaProgramado(alerta: Alerta, agora: Date = new Date()): boolean {
  return calcularEstado(alerta, agora) === "programado";
}
