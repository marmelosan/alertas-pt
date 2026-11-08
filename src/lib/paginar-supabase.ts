import type { PostgrestError } from "@supabase/supabase-js";

/**
 * O PostgREST aplica um limite por omissão às linhas devolvidas por um
 * SELECT sem paginação explícita (tipicamente 1000) — um pedido único a
 * uma tabela que cresce (como `alertas`, desde que a sincronização da
 * E-Redes deixou de ter um limite de 500 registos) arrisca perder
 * concelhos inteiros em silêncio, sem nenhum erro a avisar — foi o que
 * aconteceu a sério em produção (Setúbal/Portimão a desaparecer do
 * resumo de /cortes mas não do mapa, cuja leitura calhava de ser mais
 * pequena). Pagina até uma página vir mais curta que o pedido, garantindo
 * que volta tudo, não só o que coube na primeira página.
 */
export async function paginarTudo<T>(
  // PromiseLike, não Promise: o query builder do Supabase é "thenable" mas
  // não implementa a interface Promise completa (sem .catch/.finally).
  pedirPagina: (desde: number, ate: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
  tamanhoPagina = 1000
): Promise<T[]> {
  const todos: T[] = [];
  let desde = 0;
  let paginaCompleta = true;

  while (paginaCompleta) {
    const { data, error } = await pedirPagina(desde, desde + tamanhoPagina - 1);
    if (error) throw error;
    todos.push(...(data ?? []));
    paginaCompleta = (data?.length ?? 0) === tamanhoPagina;
    desde += tamanhoPagina;
  }

  return todos;
}
