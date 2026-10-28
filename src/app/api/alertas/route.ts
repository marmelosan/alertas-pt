import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const LIMITE_REPORTES = 3;
const JANELA_MINUTOS = 10;

interface CorpoPedido {
  tipo_servico?: unknown;
  concelho?: unknown;
  freguesia?: unknown;
  descricao?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  client_id?: unknown;
}

function validar(corpo: CorpoPedido): string | null {
  if (corpo.tipo_servico !== "agua" && corpo.tipo_servico !== "luz") {
    return "tipo_servico tem de ser 'agua' ou 'luz'";
  }
  if (typeof corpo.concelho !== "string" || corpo.concelho.trim().length === 0) {
    return "concelho é obrigatório";
  }
  if (typeof corpo.latitude !== "number" || corpo.latitude < -90 || corpo.latitude > 90) {
    return "latitude inválida";
  }
  if (typeof corpo.longitude !== "number" || corpo.longitude < -180 || corpo.longitude > 180) {
    return "longitude inválida";
  }
  if (typeof corpo.client_id !== "string" || corpo.client_id.length < 8) {
    return "client_id em falta";
  }
  return null;
}

export async function POST(req: NextRequest) {
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

  const supabase = getSupabaseServiceClient();
  const clientId = corpo.client_id as string;

  const desde = new Date(Date.now() - JANELA_MINUTOS * 60_000).toISOString();
  const { count, error: erroContagem } = await supabase
    .from("alertas")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("criado_em", desde);

  if (erroContagem) {
    console.error("[api/alertas] erro a verificar rate limit:", erroContagem);
    return NextResponse.json({ erro: "erro interno" }, { status: 500 });
  }

  if ((count ?? 0) >= LIMITE_REPORTES) {
    return NextResponse.json(
      { erro: `Já reportaste ${LIMITE_REPORTES} vezes nos últimos ${JANELA_MINUTOS} min. Espera um pouco.` },
      { status: 429 }
    );
  }

  const { data, error } = await supabase
    .from("alertas")
    .insert({
      tipo_servico: corpo.tipo_servico,
      concelho: (corpo.concelho as string).trim().slice(0, 100),
      freguesia: typeof corpo.freguesia === "string" ? corpo.freguesia.trim().slice(0, 100) || null : null,
      descricao: typeof corpo.descricao === "string" ? corpo.descricao.trim().slice(0, 140) || null : null,
      latitude: corpo.latitude,
      longitude: corpo.longitude,
      client_id: clientId,
      origem: "comunidade",
    })
    .select()
    .single();

  if (error) {
    console.error("[api/alertas] erro a inserir:", error);
    return NextResponse.json({ erro: "não consegui guardar o alerta" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
