import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { dentroDoLimitePorIp } from "@/lib/limitador-ip";

interface CorpoPedido {
  alerta_id?: unknown;
  client_id?: unknown;
}

function validar(corpo: CorpoPedido): string | null {
  if (typeof corpo.alerta_id !== "string" || corpo.alerta_id.length === 0) return "alerta_id é obrigatório";
  if (typeof corpo.client_id !== "string" || corpo.client_id.length < 8) return "client_id em falta";
  return null;
}

/**
 * Fábrica da rota POST para as três ações sobre um alerta já existente
 * (votar/denunciar/marcar resolvido) — mesmo corpo esperado, mesma
 * validação, mesmo limite por IP; só o RPC do Supabase e o `tipo` do
 * limite mudam. Evita triplicar o mesmo handler em três ficheiros.
 *
 * Existe porque estas três ações eram chamadas diretamente do browser
 * para o Supabase (nunca passavam por aqui) — só eram limitadas por
 * client_id, que uma janela anónima recria à vontade. Um IP real é muito
 * mais caro de trocar do que isso.
 */
export function criarRotaRpc(nomeRpc: string, tipoLimite: string, limitePorIp: number, janelaMinutos: number) {
  return async function POST(req: NextRequest) {
    let corpo: CorpoPedido;
    try {
      corpo = await req.json();
    } catch {
      return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
    }

    const erroValidacao = validar(corpo);
    if (erroValidacao) {
      return NextResponse.json({ erro: erroValidacao }, { status: 400 });
    }

    try {
      const supabase = getSupabaseServiceClient();

      const dentroDoLimite = await dentroDoLimitePorIp(supabase, {
        req,
        tipo: tipoLimite,
        limite: limitePorIp,
        janelaMinutos,
      });
      if (!dentroDoLimite) {
        return NextResponse.json({ erro: "Demasiados pedidos vindos desta rede. Espera um pouco." }, { status: 429 });
      }

      const { data, error } = await supabase.rpc(nomeRpc, {
        alerta_id: corpo.alerta_id,
        p_client_id: corpo.client_id,
      });

      if (error) {
        console.error(`[api/${nomeRpc}] erro no RPC:`, error);
        return NextResponse.json({ erro: "não consegui processar o pedido" }, { status: 500 });
      }

      return NextResponse.json(data);
    } catch (erro) {
      console.error(`[api/${nomeRpc}] erro inesperado:`, erro);
      return NextResponse.json({ erro: erro instanceof Error ? erro.message : "erro interno" }, { status: 500 });
    }
  };
}
