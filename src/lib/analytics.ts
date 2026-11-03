import type { TipoServico } from "@/types/alerta";

// window.dataLayer já vem tipado pelo @next/third-parties/google.

/** Empurra sempre para o dataLayer — o GTM decide se dispara alguma tag, consoante o consentimento. */
export function registarEvento(evento: string, parametros: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: evento, ...parametros });
}

/**
 * Eventos "Layer 1" (plano de tracking) — um wrapper tipado por evento, de
 * propósito, em vez de chamar registarEvento() à mão em cada sítio. A
 * assinatura de cada função é a própria lista de parâmetros permitida: não
 * dá para passar coordenadas, texto de pesquisa, texto livre ou
 * identificadores por engano, porque o tipo nem o aceita.
 */

export function registarInicioReporte(metodo: "mapa" | "localizacao") {
  registarEvento("report_start", { metodo });
}

/**
 * O formulário de reporte é um único ecrã, não um wizard — não há "passos"
 * literais. A escolha do tipo de serviço (luz/água) é o único momento do
 * formulário que vale a pena tratar como uma etapa concluída.
 */
export function registarEtapaReporte(etapa: "tipo_servico") {
  registarEvento("report_step_complete", { etapa });
}

export function registarReporteEnviado(tipo_servico: TipoServico, concelho: string) {
  registarEvento("report_submitted", { tipo_servico, concelho });
}

export function registarReporteEmFilaOffline(tipo_servico: TipoServico) {
  registarEvento("report_queued_offline", { tipo_servico });
}

export function registarReportesSincronizados(quantidade: number) {
  registarEvento("report_synced", { quantidade });
}

export function registarErroReporte(etapa: "geolocalizacao" | "submissao") {
  registarEvento("report_error", { etapa });
}

export function registarCliqueLocalizarMe() {
  registarEvento("locate_me_click");
}

export function registarAberturaMarcador(
  tipo_servico: TipoServico,
  origem: "oficial" | "comunidade",
  estado: "ativo" | "por_confirmar" | "programado"
) {
  registarEvento("marker_open", { tipo_servico, origem, estado });
}

export function registarFiltroUsado(filtro: TipoServico | "todos") {
  registarEvento("filter_used", { filtro });
}

/** Nunca leva o texto pesquisado — só confirma que a pesquisa foi usada. */
export function registarPesquisaUsada() {
  registarEvento("search_used");
}

export function registarVistaConcelho(concelho: string) {
  registarEvento("concelho_page_view", { concelho });
}

/**
 * Prontas a usar — ainda não há nenhuma funcionalidade de "subscrever
 * alertas de um concelho" no site, por isso nada chama estas funções
 * neste momento. Ficam aqui já com a assinatura certa para quando essa
 * funcionalidade existir.
 */
export function registarSubscricaoAlerta(concelho: string) {
  registarEvento("alert_subscribe", { concelho });
}

export function registarCancelamentoSubscricaoAlerta(concelho: string) {
  registarEvento("alert_unsubscribe", { concelho });
}
