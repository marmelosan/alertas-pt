import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Droplet, Zap } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import {
  obterUltimaAtualizacaoOficial,
  listarCartoesConcelhos,
  listarConcelhosComCortesProgramados,
} from "@/lib/alertas-server";
import { tempoRelativo } from "@/lib/tempo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";
const TITULO = "Estado do sistema | Foi Abaixo";
const DESCRICAO = "Quando foi a última sincronização com a E-Redes e o que está ativo agora no Foi Abaixo.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: `${SITE_URL}/estado` },
  openGraph: { title: TITULO, description: DESCRICAO, url: `${SITE_URL}/estado`, images: ["/opengraph-image"] },
  twitter: { title: TITULO, description: DESCRICAO },
};

// force-dynamic, não ISR: é uma página de estado — sentido útil só se mostrar
// sempre o valor mais recente a cada pedido, nunca uma versão em cache de
// até 60s. Também evita que o `next build` tente pré-gerar esta página (e
// falhe a pedir dados ao Supabase) em ambientes sem acesso à rede.
export const dynamic = "force-dynamic";

// A sincronização corre a cada ~6h (GitHub Actions + Vercel Cron, ver
// .github/workflows/sync-eredes.yml) — acima disto já é razoável suspeitar
// que parou, em vez de ser só a janela normal entre corridas.
const HORAS_PARA_SUSPEITAR_DE_FALHA = 8;

function horasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export default async function PaginaEstado() {
  const [ultimaAtualizacao, cartoes, programados] = await Promise.all([
    obterUltimaAtualizacaoOficial(),
    listarCartoesConcelhos(),
    listarConcelhosComCortesProgramados(),
  ]);

  const totalAtivos = cartoes.reduce((soma, c) => soma + c.total, 0);
  const concelhosOficiais = cartoes.filter((c) => c.oficial).length;
  const concelhosComunidade = cartoes.filter((c) => c.comunidade).length;

  const horasDesdeSync = ultimaAtualizacao ? horasDesde(ultimaAtualizacao) : null;
  const syncSuspeita = horasDesdeSync === null || horasDesdeSync > HORAS_PARA_SUSPEITAR_DE_FALHA;

  return (
    <div className="mx-auto flex max-w-[680px] flex-1 flex-col gap-6 px-4 py-8">
      <Breadcrumb trilha={[{ label: "Estado do sistema" }]} />

      <header>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Estado do sistema</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Transparência sobre quando os dados oficiais foram atualizados pela última vez e o que está ativo agora.
        </p>
      </header>

      <section
        className={`flex items-start gap-3 rounded-xl border p-4 ${
          syncSuspeita
            ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
            : "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
        }`}
      >
        {syncSuspeita ? (
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        ) : (
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" aria-hidden />
        )}
        <div>
          <p className="font-semibold text-stone-900 dark:text-stone-50">
            {ultimaAtualizacao
              ? `Sincronização com a E-Redes: ${tempoRelativo(ultimaAtualizacao)}`
              : "Ainda sem nenhuma sincronização com a E-Redes registada"}
          </p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            {syncSuspeita
              ? "Está mais tempo do que o esperado sem atualização — os cortes de luz programados apresentados podem não refletir a informação mais recente da E-Redes."
              : "Dentro do intervalo normal (a sincronização corre várias vezes por dia)."}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { valor: totalAtivos, rotulo: "falhas ativas" },
          { valor: concelhosOficiais, rotulo: "concelhos com cortes oficiais" },
          { valor: concelhosComunidade, rotulo: "concelhos com reportes da comunidade" },
          { valor: programados.length, rotulo: "concelhos com cortes programados" },
        ].map((item) => (
          <div
            key={item.rotulo}
            className="flex flex-col gap-1 rounded-xl border border-stone-200 p-4 dark:border-stone-800"
          >
            <span className="text-2xl font-bold text-stone-900 dark:text-stone-50">{item.valor}</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">{item.rotulo}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold tracking-wide text-stone-900 uppercase dark:text-stone-50">
          Por tipo de serviço
        </h2>
        <div className="flex flex-col gap-2 text-sm">
          <p className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
            <Zap size={16} className="shrink-0 text-amber-500" aria-hidden />
            <strong>Luz:</strong> cruzamos reportes da comunidade com os cortes programados publicados pela E-Redes
            (dados abertos, atualizados pela sincronização acima).
          </p>
          <p className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
            <Droplet size={16} className="shrink-0 text-sky-500" aria-hidden />
            <strong>Água:</strong> sem fonte oficial integrada ainda — todos os alertas de água vêm só de reportes
            diretos da comunidade, nunca de um dataset das entidades gestoras.
          </p>
        </div>
      </section>

      <p className="text-sm text-stone-600 dark:text-stone-400">
        Para saber como calculamos o estado de cada alerta e as regras de confirmação, vê{" "}
        <Link href="/como-verificamos" className="font-semibold underline">
          como verificamos
        </Link>
        .
      </p>

      <Link
        href="/"
        className="self-start rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
      >
        Ver no mapa
      </Link>
    </div>
  );
}
