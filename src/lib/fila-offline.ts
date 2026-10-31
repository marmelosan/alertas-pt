import type { NovoAlerta } from "@/types/alerta";

const CHAVE = "foiabaixo:fila-offline";

export interface ItemFila extends NovoAlerta {
  client_id: string;
}

function lerFila(): ItemFila[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as ItemFila[]) : [];
  } catch {
    return [];
  }
}

function guardarFila(fila: ItemFila[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(fila));
  } catch {
    // localStorage pode falhar (modo privado, quota cheia) — perde-se o
    // reporte pendente, mas não vale a pena rebentar a app por isto.
  }
}

export function adicionarAFila(item: ItemFila) {
  const fila = lerFila();
  fila.push(item);
  guardarFila(fila);
}

export function contarFila(): number {
  return lerFila().length;
}

/**
 * Tenta reenviar tudo o que está na fila. Cada item com sucesso sai da
 * fila; falhas (sem rede outra vez, ou erro real do servidor) ficam lá
 * para a próxima tentativa — exceto erros que nunca vão resolver-se
 * sozinhos (ex.: 400 de validação), esses são descartados.
 */
export async function processarFila(): Promise<{ enviados: number; restantes: number }> {
  const fila = lerFila();
  if (fila.length === 0) return { enviados: 0, restantes: 0 };

  const aManter: ItemFila[] = [];
  let enviados = 0;

  for (const item of fila) {
    try {
      const res = await fetch("/api/alertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });

      if (res.ok) {
        enviados++;
      } else if (res.status >= 500 || res.status === 429) {
        // falha temporária do servidor — tenta outra vez mais tarde
        aManter.push(item);
      }
      // 4xx que não seja 429: dados inválidos, nunca vai funcionar — descarta
    } catch {
      // ainda sem rede — mantém para a próxima tentativa
      aManter.push(item);
    }
  }

  guardarFila(aManter);
  return { enviados, restantes: aManter.length };
}
