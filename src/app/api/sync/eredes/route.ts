import { NextRequest, NextResponse } from "next/server";
import { sincronizarEredes } from "@/lib/eredes-sync";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const segredoEsperado = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!segredoEsperado || auth !== `Bearer ${segredoEsperado}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  try {
    const resultado = await sincronizarEredes();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (erro) {
    console.error("[api/sync/eredes] falhou:", erro);
    return NextResponse.json(
      { ok: false, erro: erro instanceof Error ? erro.message : "erro desconhecido" },
      { status: 500 }
    );
  }
}
