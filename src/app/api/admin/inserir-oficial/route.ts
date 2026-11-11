import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { tokenDeSessao, NOME_COOKIE_ADMIN } from "@/lib/admin-auth";
import { ehConcelhoValido, estaDentroDoConcelho } from "@/lib/concelhos-validos";

/**
 * Desvio (em minutos, a somar a UTC) da hora de Lisboa num instante dado —
 * mesma lógica (e mesma razão para estar duplicada em vez de partilhada)
 * que eredes-sync.ts e tejo-ambiente.ts: pequena, autocontida, e não vale a
 * pena arriscar mexer nesses ficheiros só para poupar isto.
 */
function desvioHorarioLisboa(instanteAproximado: Date): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Lisbon",
    timeZoneName: "shortOffset",
  }).formatToParts(instanteAproximado);
  const nomeFuso = partes.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = nomeFuso.match(/GMT([+-]\d+)/);
  return match ? Number(match[1]) * 60 : 0;
}

/** `<input type="datetime-local">` dá "YYYY-MM-DDTHH:MM", sem fuso — assume-se hora de Lisboa. */
function horaLocalParaTimestamptz(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor) return null;
  const aproximado = new Date(`${valor}:00Z`);
  if (Number.isNaN(aproximado.getTime())) return null;
  const desvioMin = desvioHorarioLisboa(aproximado);
  return new Date(aproximado.getTime() - desvioMin * 60000).toISOString();
}

interface CorpoPedido {
  tipo_servico?: unknown;
  concelho?: unknown;
  freguesia?: unknown;
  descricao?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  data_inicio?: unknown;
  data_fim?: unknown;
  external_id?: unknown;
}

function validar(corpo: CorpoPedido): string | null {
  if (corpo.tipo_servico !== "agua" && corpo.tipo_servico !== "luz") {
    return "tipo_servico tem de ser 'agua' ou 'luz'";
  }
  if (typeof corpo.concelho !== "string" || !ehConcelhoValido(corpo.concelho)) {
    return "concelho não reconhecido — tem de ser um concelho português real";
  }
  if (typeof corpo.latitude !== "number" || corpo.latitude < -90 || corpo.latitude > 90) {
    return "latitude inválida";
  }
  if (typeof corpo.longitude !== "number" || corpo.longitude < -180 || corpo.longitude > 180) {
    return "longitude inválida";
  }
  if (estaDentroDoConcelho(corpo.concelho, corpo.latitude, corpo.longitude) === false) {
    return "localização não corresponde ao concelho indicado";
  }
  if (typeof corpo.external_id !== "string" || corpo.external_id.trim().length === 0) {
    return "external_id é obrigatório (usa algo identificável, ex.: 'manual:sardoal-2026-11-15')";
  }
  return null;
}

/**
 * Inserção manual de alertas oficiais — Bloco 13, para fontes de água sem
 * adaptador automático ainda. `external_id` é sempre obrigatório (ao
 * contrário de /api/alertas, para reportes da comunidade): voltar a
 * submeter o mesmo external_id atualiza a linha em vez de duplicar,
 * exatamente como os jobs de sincronização automáticos já fazem.
 */
export async function POST(req: NextRequest) {
  const token = tokenDeSessao();
  if (!token || req.cookies.get(NOME_COOKIE_ADMIN)?.value !== token) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

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

  const dataInicio = horaLocalParaTimestamptz(corpo.data_inicio);
  if (!dataInicio) {
    return NextResponse.json({ erro: "hora de início é obrigatória" }, { status: 400 });
  }
  const dataFim = horaLocalParaTimestamptz(corpo.data_fim);

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("alertas")
    .upsert(
      {
        tipo_servico: corpo.tipo_servico,
        concelho: (corpo.concelho as string).trim(),
        freguesia: typeof corpo.freguesia === "string" ? corpo.freguesia.trim().slice(0, 100) || null : null,
        descricao: typeof corpo.descricao === "string" ? corpo.descricao.trim().slice(0, 140) || null : null,
        latitude: corpo.latitude,
        longitude: corpo.longitude,
        data_inicio: dataInicio,
        data_fim: dataFim,
        external_id: (corpo.external_id as string).trim(),
        origem: "oficial",
        status: "ativo",
      },
      { onConflict: "external_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[api/admin/inserir-oficial] erro:", error);
    return NextResponse.json({ erro: "não consegui gravar o alerta" }, { status: 500 });
  }

  return NextResponse.json(data);
}
