declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

/** Empurra sempre para o dataLayer — o GTM decide se dispara alguma tag, consoante o consentimento. */
export function registarEvento(evento: string, parametros: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: evento, ...parametros });
}
