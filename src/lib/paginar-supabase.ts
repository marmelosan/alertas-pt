import type { PostgrestError } from "@supabase/supabase-js";

/**
 * O PostgREST aplica um limite às linhas devolvidas por um SELECT — e esse
 * limite pode ser mais baixo do que o `range()` pedido (configuração do
 * projeto, `db-max-rows`), sem nenhum erro a avisar disso. A primeira
 * versão disto assumia "página mais curta do que pedi = acabou", o que
 * reproduz o mesmo bug de truncagem silenciosa se o limite real do
 * servidor for mais baixo do que o tamanho de página pedido aqui (foi
 * exatamente o que aconteceu: concelhos continuavam a faltar depois do
 * primeiro fix). A versão certa usa o total exato que o PostgREST devolve
 * via `count: "exact"` como critério de paragem — não o tamanho da
 * página — e avança pelo número de linhas que realmente vieram, não pelo
 * que foi pedido, por isso funciona seja qual for o limite real do
 * servidor, conhecido ou não.
 */
export async function paginarTudo<T>(
  // PromiseLike, não Promise: o query builder do Supabase é "thenable" mas
  // não implementa a interface Promise completa (sem .catch/.finally).
  pedirPagina: (
    desde: number,
    ate: number
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null; count?: number | null }>,
  tamanhoPagina = 1000
): Promise<T[]> {
  const todos: T[] = [];
  let desde = 0;
  let totalConhecido: number | null = null;

  while (totalConhecido === null || todos.length < totalConhecido) {
    const { data, error, count } = await pedirPagina(desde, desde + tamanhoPagina - 1);
    if (error) throw error;
    if (typeof count === "number") totalConhecido = count;

    const recebidos = data?.length ?? 0;
    // Nada veio: para, mesmo que `count` sugerisse mais — mais vale voltar
    // incompleto do que entrar em ciclo infinito por um total errado.
    if (recebidos === 0) break;

    todos.push(...(data ?? []));
    desde += recebidos;
  }

  return todos;
}
