import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { ehConcelhoValido, estaDentroDoConcelho } from "@/lib/concelhos-validos";

const LIMITE_REPORTES_DISPOSITIVO = 3;
const LIMITE_REPORTES_IP = 6; // mais folgado — um IP pode ser várias pessoas na mesma rede (casa, prédio)
const JANELA_MINUTOS = 10;

/**
 * Privacidade: arredonda a 3 casas decimais (~100m) antes de guardar —
 * mostra o quarteirão/rua, nunca a casa exata de quem reportou. O mesmo
 * princípio do Faltou ("só mostra a localidade"), aplicado no servidor
 * para não depender de ninguém se lembrar de o fazer no cliente.
 */
function arredondarPrivacidade(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}

/**
 * Nunca guardamos o IP em bruto (Bloco 6 do briefing) — só este hash, numa
 * tabela sem leitura pública, só para detetar picos de reportes da mesma
 * rede. Não é reversível, não identifica ninguém sozinho.
 */
function hashDoIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

function obterIp(req: NextRequest): string | null {
  // Vercel (e a generalidade dos proxies) põe o IP real aqui; o primeiro
  // valor da lista é o do cliente.
  const encaminhado = req.headers.get("x-forwarded-for");
  return encaminhado ? encaminhado.split(",")[0].trim() : null;
}

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
  // Sem isto, um ponto no meio do oceano (geocodificação reversa falhada ou
  // manipulada) gerava um concelho fantasma e uma página pública a sério
  // para ele — já aconteceu em produção (ver "Oceano Atlântico").
  if (!ehConcelhoValido(corpo.concelho)) {
    return "concelho não reconhecido — tem de ser um concelho português real";
  }
  if (typeof corpo.latitude !== "number" || corpo.latitude < -90 || corpo.latitude > 90) {
    return "latitude inválida";
  }
  if (typeof corpo.longitude !== "number" || corpo.longitude < -180 || corpo.longitude > 180) {
    return "longitude inválida";
  }
  // Nome certo não chega sozinho — já aconteceu "Braga" com coordenadas
  // perto de Lugo, em Espanha. Caixa delimitadora com margem generosa
  // (~15km), não o polígono exato: apanha disparates óbvios sem rejeitar
  // à toa um reporte genuíno perto de uma fronteira entre concelhos.
  if (estaDentroDoConcelho(corpo.concelho, corpo.latitude, corpo.longitude) === false) {
    return "localização não corresponde ao concelho indicado";
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

  // Tudo o que se segue depende do Supabase (config em falta, rede, etc.) —
  // apanhado aqui para nunca devolvermos uma resposta vazia/sem JSON ao
  // cliente, seja qual for o motivo da falha.
  try {
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

    if ((count ?? 0) >= LIMITE_REPORTES_DISPOSITIVO) {
      return NextResponse.json(
        { erro: `Já reportaste ${LIMITE_REPORTES_DISPOSITIVO} vezes nos últimos ${JANELA_MINUTOS} min. Espera um pouco.` },
        { status: 429 }
      );
    }

    // Limite por IP (hash), além do limite por dispositivo acima — apanha
    // quem limpa o localStorage ou usa vários dispositivos na mesma rede.
    const ip = obterIp(req);
    if (ip) {
      const ipHash = hashDoIp(ip);
      const { count: contagemIp, error: erroContagemIp } = await supabase
        .from("limitador_ip")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("criado_em", desde);

      if (erroContagemIp) {
        console.error("[api/alertas] erro a verificar rate limit por IP:", erroContagemIp);
        // falha a verificar não deve impedir o reporte — só o limite por
        // dispositivo (já confirmado acima) é garantidamente aplicado
      } else if ((contagemIp ?? 0) >= LIMITE_REPORTES_IP) {
        return NextResponse.json(
          { erro: "Demasiados reportes vindos desta rede. Espera um pouco." },
          { status: 429 }
        );
      } else {
        await supabase.from("limitador_ip").insert({ ip_hash: ipHash });
      }
    }

    const { data, error } = await supabase
      .from("alertas")
      .insert({
        tipo_servico: corpo.tipo_servico,
        concelho: (corpo.concelho as string).trim().slice(0, 100),
        freguesia: typeof corpo.freguesia === "string" ? corpo.freguesia.trim().slice(0, 100) || null : null,
        descricao: typeof corpo.descricao === "string" ? corpo.descricao.trim().slice(0, 140) || null : null,
        latitude: arredondarPrivacidade(corpo.latitude as number),
        longitude: arredondarPrivacidade(corpo.longitude as number),
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
  } catch (erro) {
    console.error("[api/alertas] erro inesperado:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "erro interno" },
      { status: 500 }
    );
  }
}
