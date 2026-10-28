import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { obterConcelhoPorSlug, listarAlertasDoConcelho } from "@/lib/alertas-server";

export const revalidate = 300; // 5 min — conteúdo sempre fresco sem rebuild manual
export const dynamicParams = true; // concelhos novos funcionam mesmo sem estarem no sitemap ainda

interface PageProps {
  params: Promise<{ concelho: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://alertas-pt.vercel.app";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { concelho: slug } = await params;
  const concelho = await obterConcelhoPorSlug(slug);

  if (!concelho) {
    return { title: "Concelho não encontrado | Alertas PT" };
  }

  const alertas = await listarAlertasDoConcelho(concelho);
  const ativos = alertas.filter((a) => a.status === "ativo");
  const descricao = ativos.length
    ? `${ativos.length} ${ativos.length === 1 ? "falha ativa" : "falhas ativas"} reportadas em ${concelho} agora.`
    : `Sem falhas de água ou luz reportadas em ${concelho} neste momento.`;

  return {
    title: `Falta de Água e Luz em ${concelho} | Alertas PT`,
    description: descricao,
    alternates: { canonical: `${SITE_URL}/cortes/${slug}` },
    openGraph: {
      title: `Cortes de água e luz em ${concelho}`,
      description: descricao,
      url: `${SITE_URL}/cortes/${slug}`,
    },
  };
}

function tempoRelativo(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  return `há ${Math.floor(minutos / 60)}h`;
}

export default async function PaginaConcelho({ params }: PageProps) {
  const { concelho: slug } = await params;
  const concelho = await obterConcelhoPorSlug(slug);

  if (!concelho) notFound();

  const alertas = await listarAlertasDoConcelho(concelho);
  const ativos = alertas.filter((a) => a.status === "ativo");
  const luzAtivos = ativos.filter((a) => a.tipo_servico === "luz");
  const aguaAtivos = ativos.filter((a) => a.tipo_servico === "agua");

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

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:underline">
          ⚡💧 Alertas PT
        </Link>{" "}
        / {concelho}
      </nav>

      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Cortes de Água e Luz em {concelho}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
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
              className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                {a.tipo_servico === "luz" ? "⚡ Falta de luz" : "💧 Falta de água"}
                {a.freguesia ? ` — ${a.freguesia}` : ""}
              </p>
              {a.descricao && <p className="text-sm text-zinc-600 dark:text-zinc-400">{a.descricao}</p>}
              <p className="mt-1 text-xs text-zinc-500">
                {tempoRelativo(a.criado_em)} ·{" "}
                {a.origem === "oficial" ? "fonte oficial (E-Redes)" : `${a.contador_votos} confirmações da comunidade`}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/"
        className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900"
      >
        Ver no mapa / reportar uma falha
      </Link>
    </div>
  );
}
