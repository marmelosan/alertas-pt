import L from "leaflet";
import type { Alerta, TipoServico } from "@/types/alerta";

export type EstadoVisualMarcador = "ativo" | "por_confirmar" | "programado";

const CORES: Record<TipoServico, string> = {
  luz: "#f59e0b",
  agua: "#0ea5e9",
};

/**
 * Ícone de marcador partilhado entre o mapa interativo da home e o mapa
 * por concelho — a mesma linguagem visual nos dois sítios, para quem já
 * aprendeu a ler um não ter de decifrar outro código de cores no outro.
 *
 * origem oficial = quadrado; comunidade = círculo. A forma sozinha é um
 * sinal fraco a 18px (um quadrado arredondado e um círculo ficam
 * parecidos de relance); o contorno reforça-a com um segundo sinal
 * independente: oficial tem contorno escuro grosso, comunidade mantém o
 * branco fino.
 */
export function criarIconeAlerta(
  tipo: TipoServico,
  origem: Alerta["origem"],
  estadoVisual: EstadoVisualMarcador
): L.DivIcon {
  const cor = CORES[tipo];
  const forma =
    origem === "oficial"
      ? `width:14px;height:14px;border-radius:3px;`
      : `width:16px;height:16px;border-radius:50%;`;
  const contorno = origem === "oficial" ? "3px solid #1c1917" : "2px solid white";

  if (estadoVisual === "por_confirmar") {
    // "por confirmar" (Bloco 6): preenchimento oco + contorno tracejado, em vez
    // de sólido — sinaliza visualmente que ainda não é uma falha confirmada.
    // Só acontece para reportes da comunidade (um corte oficial nunca fica
    // "por confirmar"), por isso não há conflito visual com "programado" abaixo.
    return L.divIcon({
      className: "",
      html: `<div style="${forma}background:white;border:2px dashed ${cor};opacity:0.85;"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  if (estadoVisual === "programado") {
    // Corte oficial já confirmado pela E-Redes mas que ainda não começou —
    // mesmo quadrado/cor do oficial ativo (para se reconhecer que é da
    // E-Redes à mesma), só mais esbatido e com contorno tracejado, para não
    // se confundir com um corte já em curso agora.
    return L.divIcon({
      className: "",
      html: `<div style="${forma}background:${cor};border:2px dashed #1c1917;opacity:0.55;"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  return L.divIcon({
    className: "",
    html: `<div style="${forma}background:${cor};border:${contorno};box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}
