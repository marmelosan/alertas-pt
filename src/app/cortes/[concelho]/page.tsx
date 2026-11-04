import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { obterConcelhoPorSlug, listarAlertasDoConcelho, listarHistoricoDosAlertas } from "@/lib/alertas-server";
import type { HistoricoAlerta } from "@/lib/alertas-server";
import { estaAtivo, estaPorConfirmar, estaProgramado } from "@/lib/estado-alerta";
import { formatarDuracao } from "@/lib/tempo";
import { LINK_FONTE_EREDES, NOME_FONTE_EREDES } from "@/lib/fontes";
import { Breadcrumb } from "@/components/Breadcrumb";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { BotaoJaVoltou } from "@/components/BotaoJaVoltou";
import { Zap, Droplet, ShieldCheck, Users, CheckCircle2 } from "lucide-react";
import { RegistarVistaConcelho } from "@/components/RegistarVistaConcelho";
import type { Alerta } from "@/types/alerta";

export const revalidate = 300; // 5 min — conteúdo sempre fresco sem rebuild manual
export const dynamicParams = true; // concelhos novos funcionam mesmo sem estarem no sitemap ainda

interface PageProps {
  params: Promise<{ concelho: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { concelho: slug } = await params;
  const concelho = await obterConcelhoPorSlug(slug);

  if (!concelho) {
    return { title: "Concelho não encontrado | Foi Abaixo" };
  }

  const alertas = await listarAlertasDoConcelho(concelho);
  const ativos = alertas.filter((a) => estaAtivo(a));
  const descricao = ativos.length
    ? `${ativos.length} ${ativos.length === 1 ? "falha ativa" : "falhas ativas"} reportadas em ${concelho} agora.`
    : `Sem falhas de água ou luz reportadas em ${concelho} neste momento.`;

  return {
    title: `Falta de Água e Luz em ${concelho} | Foi Abaixo`,
    description: descricao,
    alternates: { canonical: `${SITE_URL}/cortes/${slug}` },
    openGraph: {
      title: `Cortes de água e luz em ${concelho}`,
      description: descricao,
      url: `${SITE_URL}/cortes/${slug}`,
      images: ["/opengraph-image"],
    },
    twitter: { title: `Cortes de água e luz em ${concelho}`, description: descricao },
  };
}

function tempoRelativo(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  return `há ${Math.floor(minutos / 60)}h`;
}

function dataFormatada(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CorteProgramadoAgrupado extends Alerta {
  /** Quantas ruas/zonas diferentes a E-Redes listou para esta mesma janela — 1 = sem agrupamento. */
  zonas: number;
  /** Ids de todas as linhas fundidas neste grupo — para encontrar correções no histórico de qualquer uma delas. */
  idsGrupo: string[];
}

/**
 * A E-Redes lista o mesmo corte uma vez por rua/zona afetada dentro da
 * mesma freguesia, cada uma com o seu próprio registo — sem agrupar por
 * freguesia + janela horária, a lista mostrava a mesma manutenção
 * repetida dezenas de vezes seguidas.
 */
function agruparProgramados(alertas: Alerta[]): CorteProgramadoAgrupado[] {
  const porChave = new Map<string, CorteProgramadoAgrupado>();
  for (const alerta of alertas) {
    const chave = `${alerta.freguesia ?? ""}|${alerta.data_inicio ?? ""}|${alerta.data_fim ?? ""}`;
    const atual = porChave.get(chave);
    if (atual) {
      atual.zonas++;
      atual.idsGrupo.push(alerta.id);
    } else {
      porChave.set(chave, { ...alerta, zonas: 1, idsGrupo: [alerta.id] });
    }
  }
  return [...porChave.values()];
}

function rotuloCampo(campo: string): string {
  if (campo === "data_inicio") return "início";
  if (campo === "data_fim") return "fim";
  return campo;
}

/** Bloco 14, Passo 3 — "Corrigido": a E-Redes às vezes muda o horário de um corte já publicado. */
function NotasCorrecao({ ids, porAlerta }: { ids: string[]; porAlerta: Map<string, HistoricoAlerta[]> }) {
  const notas = ids.flatMap((id) => porAlerta.get(id) ?? []);
  if (notas.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-col gap-0.5">
      {notas.map((n, i) => (
        <li key={i} className="text-xs text-stone-500 dark:text-stone-500">
          Corrigido {tempoRelativo(n.criado_em)}: {rotuloCampo(n.campo)} passou de{" "}
          {n.valor_anterior ? dataFormatada(n.valor_anterior) : "—"} para{" "}
          {n.valor_novo ? dataFormatada(n.valor_novo) : "—"}
        </li>
      ))}
    </ul>
  );
}

export default async function PaginaConcelho({ params }: PageProps) {
  const { concelho: slug } = await params;
  const concelho = await obterConcelhoPorSlug(slug);

  if (!concelho) notFound();

  const alertas = await listarAlertasDoConcelho(concelho);
  const ativos = alertas.filter((a) => estaAtivo(a));
  const luzAtivos = ativos.filter((a) => a.tipo_servico === "luz");
  const aguaAtivos = ativos.filter((a) => a.tipo_servico === "agua");
  const porConfirmar = alertas.filter((a) => estaPorConfirmar(a));
  // A E-Redes lista o mesmo corte uma vez por cada rua/zona afetada dentro
  // da mesma freguesia — sem agrupar, a mesma janela de manutenção
  // aparecia repetida dezenas de vezes seguidas na lista.
  const programados = agruparProgramados(alertas.filter((a) => estaProgramado(a))).sort((a, b) =>
    (a.data_inicio ?? "").localeCompare(b.data_inicio ?? "")
  );
  // Bloco 14, Passo 2 — fechados pela comunidade via "Já voltou?", mais recentes primeiro.
  const resolvidosRecentes = alertas
    .filter((a) => a.status === "resolvido" && a.origem === "comunidade" && a.resolvido_em)
    .sort((a, b) => (b.resolvido_em ?? "").localeCompare(a.resolvido_em ?? ""))
    .slice(0, 5);

  // Bloco 14, Passo 3 — notas de "corrigido" (ex.: horário de um corte alterado pela E-Redes).
  const historico = await listarHistoricoDosAlertas(alertas.map((a) => a.id));
  const historicoPorAlerta = new Map<string, HistoricoAlerta[]>();
  for (const nota of historico) {
    const lista = historicoPorAlerta.get(nota.alerta_id) ?? [];
    lista.push(nota);
    historicoPorAlerta.set(nota.alerta_id, lista);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Falhas de água e luz em ${concelho}`,
    itemListElement: ativos.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Event",
        name: a.tipo_servico === "luz" ? `Falta de luz em ${a.freguesia ?? concelho}` : `Falta de água em ${a.freguesia ?? concelho}`,
        startDate: a.criado_em,
        eventStatus: "https://schema.org/EventScheduled",
        location: {
          "@type": "Place",
          name: a.freguesia ? `${a.freguesia}, ${concelho}` : concelho,
          geo: { "@type": "GeoCoordinates", latitude: a.latitude, longitude: a.longitude },
        },
      },
    })),
  };

  const FAQ_CONCELHO = [
    {
      pergunta: `Como reporto uma falha de água ou luz em ${concelho}?`,
      resposta:
        "Vai ao mapa, clica no sítio exato onde falta o serviço (ou usa \"Falta aqui agora\" para localização automática), escolhe água ou luz, e envia. Não precisas de conta.",
    },
    {
      pergunta: "Estes dados são oficiais?",
      resposta:
        "Os cortes de luz programados vêm diretamente da E-Redes. Avarias inesperadas e falhas de água são reportadas pela comunidade — cada alerta mostra a origem.",
    },
  ];

  const jsonLdFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_CONCELHO.map((f) => ({
      "@type": "Question",
      name: f.pergunta,
      acceptedAnswer: { "@type": "Answer", text: f.resposta },
    })),
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFAQ) }} />
      <RegistarVistaConcelho concelho={concelho} />

      <Breadcrumb trilha={[{ label: "Concelhos", href: "/cortes" }, { label: concelho }]} />

      <header>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">
          Cortes de Água e Luz em {concelho}
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          {ativos.length === 0 && `Sem falhas de água ou luz reportadas em ${concelho} neste momento.`}
          {ativos.length > 0 &&
            `${ativos.length} ${ativos.length === 1 ? "falha ativa" : "falhas ativas"} em ${concelho} agora — ${luzAtivos.length} de luz e ${aguaAtivos.length} de água.`}
          {" "}Dados cruzados com a E-Redes e reportados pela comunidade.
        </p>
      </header>

      {ativos.length > 0 && (
        <ul className="flex flex-col gap-3">
          {ativos.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-stone-200 p-4 dark:border-stone-800"
            >
              <p className="flex flex-wrap items-center gap-1.5 font-semibold text-stone-900 dark:text-stone-50">
                {a.tipo_servico === "luz" ? (
                  <Zap size={16} className="text-amber-500" aria-hidden />
                ) : (
                  <Droplet size={16} className="text-sky-500" aria-hidden />
                )}
                {a.tipo_servico === "luz" ? "Falta de luz" : "Falta de água"}
                {a.freguesia ? ` — ${a.freguesia}` : ""}
                {a.origem === "comunidade" && (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle2 size={10} aria-hidden /> Confirmado
                  </span>
                )}
              </p>
              {a.descricao && <p className="text-sm text-stone-600 dark:text-stone-400">{a.descricao}</p>}
              <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                {a.origem === "oficial" ? (
                  <ShieldCheck size={13} className="shrink-0" aria-hidden />
                ) : (
                  <Users size={13} className="shrink-0" aria-hidden />
                )}
                {a.origem === "oficial" ? (
                  <Link
                    href={LINK_FONTE_EREDES}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-stone-700 dark:hover:text-stone-300"
                  >
                    {NOME_FONTE_EREDES}
                  </Link>
                ) : (
                  "Comunidade"
                )}{" "}
                · {tempoRelativo(a.criado_em)}
                {a.origem === "comunidade" && ` · ${a.contador_votos} confirmações`}
              </p>
              <NotasCorrecao ids={[a.id]} porAlerta={historicoPorAlerta} />
              {a.origem === "comunidade" && (
                <div className="mt-2">
                  <BotaoJaVoltou id={a.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {porConfirmar.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-wide text-stone-900 uppercase dark:text-stone-50">
            Por confirmar
          </h2>
          <p className="-mt-2 text-xs text-stone-500">
            Só um reporte até agora. Confirma se também estás sem isto para ajudar a validar.
          </p>
          <ul className="flex flex-col gap-3">
            {porConfirmar.map((a) => (
              <li key={a.id} className="rounded-xl border border-dashed border-stone-300 p-4 dark:border-stone-700">
                <p className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-stone-50">
                  {a.tipo_servico === "luz" ? (
                    <Zap size={16} className="text-amber-500 opacity-60" aria-hidden />
                  ) : (
                    <Droplet size={16} className="text-sky-500 opacity-60" aria-hidden />
                  )}
                  {a.tipo_servico === "luz" ? "Falta de luz" : "Falta de água"}
                  {a.freguesia ? ` — ${a.freguesia}` : ""}
                </p>
                {a.descricao && <p className="text-sm text-stone-600 dark:text-stone-400">{a.descricao}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1 text-xs text-stone-500">
                    <Users size={13} className="shrink-0" aria-hidden /> Comunidade · {tempoRelativo(a.criado_em)}
                  </p>
                  <BotaoConfirmar id={a.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {programados.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-wide text-stone-900 uppercase dark:text-stone-50">
            Programados
          </h2>
          <ul className="flex flex-col gap-3">
            {programados.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
              >
                <p className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-stone-50">
                  <Zap size={16} className="text-amber-500" aria-hidden />
                  Corte programado{a.freguesia ? ` — ${a.freguesia}` : ""}
                </p>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                  {a.data_inicio && `Começa ${dataFormatada(a.data_inicio)}`}
                  {a.data_fim && ` · termina ${dataFormatada(a.data_fim)}`}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                  <ShieldCheck size={13} className="shrink-0" aria-hidden />
                  <Link
                    href={LINK_FONTE_EREDES}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-stone-700 dark:hover:text-stone-300"
                  >
                    {NOME_FONTE_EREDES}
                  </Link>
                  {a.zonas > 1 && ` · ${a.zonas} ruas/zonas afetadas`}
                </p>
                <NotasCorrecao ids={a.idsGrupo} porAlerta={historicoPorAlerta} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {resolvidosRecentes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-wide text-stone-900 uppercase dark:text-stone-50">
            Resolvidos recentemente
          </h2>
          <ul className="flex flex-col gap-3">
            {resolvidosRecentes.map((a) => (
              <li key={a.id} className="rounded-xl border border-stone-200 p-4 opacity-80 dark:border-stone-800">
                <p className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-stone-50">
                  {a.tipo_servico === "luz" ? (
                    <Zap size={16} className="text-amber-500" aria-hidden />
                  ) : (
                    <Droplet size={16} className="text-sky-500" aria-hidden />
                  )}
                  {a.tipo_servico === "luz" ? "Falta de luz" : "Falta de água"}
                  {a.freguesia ? ` — ${a.freguesia}` : ""}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                  <Users size={13} className="shrink-0" aria-hidden /> Comunidade · durou{" "}
                  {formatarDuracao(a.criado_em, a.resolvido_em!)} · resolvido {tempoRelativo(a.resolvido_em!)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col divide-y divide-stone-200 border-t border-stone-200 pt-2 dark:divide-stone-800 dark:border-stone-800">
        {FAQ_CONCELHO.map((f) => (
          <div key={f.pergunta} className="py-3">
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200">{f.pergunta}</h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{f.resposta}</p>
          </div>
        ))}
      </section>

      <p className="flex flex-wrap gap-4 text-sm">
        <Link href="/guias/falta-de-luz" className="font-semibold text-stone-700 underline dark:text-stone-300">
          Guia: sem luz →
        </Link>
        <Link href="/guias/falta-de-agua" className="font-semibold text-stone-700 underline dark:text-stone-300">
          Guia: sem água →
        </Link>
        <Link href="/faq" className="font-semibold text-stone-700 underline dark:text-stone-300">
          Mais perguntas →
        </Link>
      </p>

      <Link
        href="/"
        className="self-start rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
      >
        Ver no mapa / reportar uma falha
      </Link>
    </div>
  );
}
