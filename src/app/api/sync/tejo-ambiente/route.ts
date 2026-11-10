import { NextRequest, NextResponse } from "next/server";
import { sincronizarTejoAmbiente } from "@/lib/tejo-ambiente-sync";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const segredoEsperado = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!segredoEsperado || auth !== `Bearer ${segredoEsperado}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  try {
    const resultado = await sincronizarTejoAmbiente();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (erro) {
    console.error("[api/sync/tejo-ambiente] falhou:", erro);
    return NextResponse.json(
      { ok: false, erro: erro instanceof Error ? erro.message : "erro desconhecido" },
      { status: 500 }
    );
  }
}
