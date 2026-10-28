const CHAVE = "alertas-pt:client-id";

/**
 * Id anónimo e estável por browser, só para limitar a frequência de
 * reportes (rate limiting) — não é usado para identificar ninguém.
 */
export function obterClientId(): string {
  if (typeof window === "undefined") return "servidor";

  let id = localStorage.getItem(CHAVE);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CHAVE, id);
  }
  return id;
}
