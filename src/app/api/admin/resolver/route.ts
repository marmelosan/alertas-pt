import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { tokenDeSessao, NOME_COOKIE_ADMIN } from "@/lib/admin-auth";

/**
 * Resolver a partir do backoffice, sem passar pelas 2 confirmações
 * independentes de /api/resolver (essa exige client_id + limite por IP —
 * faz sentido para o público, não para um administrador a moderar).
 */
export async function POST(req: NextRequest) {
  const token = tokenDeSessao();
  if (!token || req.cookies.get(NOME_COOKIE_ADMIN)?.value !== token) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  let corpo: { id?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  if (typeof corpo.id !== "string" || corpo.id.length === 0) {
    return NextResponse.json({ erro: "id é obrigatório" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("alertas")
    .update({ status: "resolvido", resolvido_em: new Date().toISOString() })
    .eq("id", corpo.id);

  if (error) {
    console.error("[api/admin/resolver] erro:", error);
    return NextResponse.json({ erro: "não consegui marcar como resolvido" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
