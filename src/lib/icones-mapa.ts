import L from "leaflet";
import type { Alerta, TipoServico } from "@/types/alerta";

export type EstadoVisualMarcador = "ativo" | "por_confirmar" | "programado";

const CORES: Record<TipoServico, string> = {
  luz: "#f59e0b",
  agua: "#0ea5e9",
};

// Glifos simples e preenchidos (não o traço fino do Lucide) — a esta
// escala (8-9px dentro do pin) um ícone de traço fica praticamente
// invisível; um silhueta cheia lê-se bem mesmo em miniatura.
const ICONES: Record<TipoServico, string> = {
  luz: '<path d="M7 2v11h3v9l7-12h-4l4-8z"/>',
  agua: '<path d="M12 2C7 7 4 11.5 4 15a8 8 0 0 0 16 0c0-3.5-3-8-8-13z"/>',
};

/**
 * Ícone de marcador partilhado entre o mapa interativo da home e o mapa
 * por concelho — a mesma linguagem visual nos dois sítios, para quem já
 * aprendeu a ler um não ter de decifrar outro código no outro.
 *
 * Três sinais independentes, não só cor: forma (quadrado = oficial,
 * círculo = comunidade), o próprio glifo dentro do pin (raio/gota, serve
 * também quem tem dificuldade em distinguir âmbar de azul) e o
 * contorno/opacidade (sólido = ativo, tracejado oco = por confirmar,
 * tracejado esbatido = programado). O estilo em si (anéis, sombra, SVG)
 * vive em globals.css na classe `.marcador-alerta`, não inline — mais
 * fácil de manter os dois mapas visualmente idênticos.
 */
export function criarIconeAlerta(
  tipo: TipoServico,
  origem: Alerta["origem"],
  estadoVisual: EstadoVisualMarcador
): L.DivIcon {
  const classes = [
    "marcador-alerta",
    origem === "oficial" ? "marcador-alerta--oficial" : "marcador-alerta--comunidade",
    estadoVisual === "por_confirmar" && "marcador-alerta--por-confirmar",
    estadoVisual === "programado" && "marcador-alerta--programado",
  ]
    .filter(Boolean)
    .join(" ");

  const html = `<div class="${classes}" style="--cor:${CORES[tipo]}">
      <span class="marcador-alerta__corpo">
        <svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[tipo]}</svg>
      </span>
    </div>`;

  return L.divIcon({
    className: "",
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}
