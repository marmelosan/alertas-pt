import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Backoffice mínimo para moderar reportes da comunidade sem SQL Editor —
 * uma password só (variável de ambiente `ADMIN_SECRET`), sem contas nem
 * tabela de utilizadores, porque é um único operador. O cookie guarda um
 * hash da password, nunca a password em bruto — e como o hash depende
 * diretamente de `ADMIN_SECRET`, mudar a variável invalida sozinho
 * qualquer sessão antiga (não precisa de uma lista de sessões revogadas).
 */
const NOME_COOKIE = "admin_sessao";

function hash(valor: string): string {
  return createHash("sha256").update(valor).digest("hex");
}

/** Comparação em tempo constante — evita um ataque de temporização a adivinhar a password carácter a carácter. */
export function segredoValido(tentativa: string): boolean {
  const segredo = process.env.ADMIN_SECRET;
  if (!segredo) return false;

  const a = Buffer.from(tentativa);
  const b = Buffer.from(segredo);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function tokenDeSessao(): string | null {
  const segredo = process.env.ADMIN_SECRET;
  return segredo ? hash(segredo) : null;
}

export const NOME_COOKIE_ADMIN = NOME_COOKIE;

/** Só em Server Components — para route handlers usa `req.cookies.get(NOME_COOKIE_ADMIN)` diretamente. */
export async function estaAutenticado(): Promise<boolean> {
  const token = tokenDeSessao();
  if (!token) return false;
  const jar = await cookies();
  return jar.get(NOME_COOKIE)?.value === token;
}
