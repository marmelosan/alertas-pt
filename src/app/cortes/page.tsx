import type { Metadata } from "next";
import Link from "next/link";
import {
  listarCartoesConcelhos,
  listarConcelhosComAlertasAtivos,
  listarConcelhosComCortesProgramados,
  obterUltimaAtualizacaoOficial,
  type CartaoConcelho,
  type ConcelhosAtivosPorOrigem,
} from "@/lib/alertas-server";
import { paraSlug } from "@/lib/slug";
import { MapaConcelhosClient } from "@/components/MapaConcelhosClient";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PesquisaConcelhos } from "@/components/PesquisaConcelhos";

export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

const TITULO = "Concelhos | Foi Abaixo";
const DESCRICAO = "Lista de concelhos com falhas de água ou luz ativas em Portugal.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: `${SITE_URL}/cortes` },
  openGraph: { title: TITULO, description: DESCRICAO, url: `${SITE_URL}/cortes`, images: ["/opengraph-image"] },
  twitter: { title: TITULO, description: DESCRICAO },
};

const jsonLdDataset = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Cortes de eletricidade programados em Portugal (E-Redes)",
  description:
    "Cortes de eletricidade programados pela E-Redes em Portugal, cruzados com reportes da comunidade sobre falhas de água e eletricidade em curso.",
  url: `${SITE_URL}/cortes`,
  license: "https://creativecommons.org/licenses/by/4.0/",
  creator: {
    "@type": "Organization",
    name: "E-Redes",
    url: "https://e-redes.opendatasoft.com/pages/homepage/",
  },
  isBasedOn: "https://e-redes.opendatasoft.com/pages/homepage/",
};

/** >36h sem sincronizar (ou nunca sincronizou) conta como desatualizado — ver Bloco 1, ponto 4. */
function estaDesatualizado(ultimaAtualizacao: string | null): boolean {
  if (!ultimaAtualizacao) return true;
  const horas = (Date.now() - new Date(ultimaAtualizacao).getTime()) / 36e5;
  return horas > 36;
}

function tempoRelativo(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 48) return `há ${horas}h`;
  return `há ${Math.floor(horas / 24)} dias`;
}

export default async function PaginaConcelhos() {
  let concelhosAtivos: ConcelhosAtivosPorOrigem = { oficial: [], comunidade: [] };
  let cartoes: CartaoConcelho[] = [];
  let concelhosProgramados: string[] = [];
  let ultimaAtualizacaoOficial: string | null = null;
  let erroAoCarregar = false;
  try {
    concelhosAtivos = await listarConcelhosComAlertasAtivos();
    cartoes = await listarCartoesConcelhos();
    concelhosProgramados = (await listarConcelhosComCortesProgramados()).sort((a, b) => a.localeCompare(b, "pt"));
    ultimaAtualizacaoOficial = await obterUltimaAtualizacaoOficial();
  } catch {
    // mostra a página na mesma, só sem dados, em vez de rebentar
    erroAoCarregar = true;
  }

  const dadosOficiaisDesatualizados = estaDesatualizado(ultimaAtualizacaoOficial);

  return (
    <div className="mx-auto flex max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdDataset) }} />
      <Breadcrumb trilha={[{ label: "Concelhos" }]} />

      <header>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Concelhos com alertas ativos</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          {cartoes.length > 0
            ? `${cartoes.length} ${cartoes.length === 1 ? "concelho" : "concelhos"} com alertas ativos agora.`
            : "Sem concelhos com alertas ativos neste momento — sê o primeiro a reportar."}
        </p>
        {erroAoCarregar ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Não consegui carregar os dados agora. Tenta recarregar a página.
          </p>
        ) : (
          <p
            className={`mt-1 text-xs ${dadosOficiaisDesatualizados ? "text-amber-700 dark:text-amber-400" : "text-stone-500"}`}
          >
            {ultimaAtualizacaoOficial
              ? `Dados oficiais da E-Redes atualizados ${tempoRelativo(ultimaAtualizacaoOficial)}`
              : "Ainda sem dados oficiais da E-Redes sincronizados"}
            {dadosOficiaisDesatualizados && " — pode estar desatualizado"}
          </p>
        )}
      </header>

      {cartoes.length > 0 && <PesquisaConcelhos cartoes={cartoes} />}

      {concelhosProgramados.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-wide text-stone-900 uppercase dark:text-stone-50">
            Programados nos próximos 7 dias
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {concelhosProgramados.map((c) => (
              <li key={c}>
                <Link
                  href={`/cortes/${paraSlug(c)}`}
                  className="block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-stone-700 hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/30 dark:text-stone-300"
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* O mapa é um complemento visual à lista acima, não o conteúdo principal da página — fica
          propositadamente mais pequeno e depois dos cartões (Bloco 4 do briefing). */}
      <div className="flex flex-col items-center gap-2 border-t border-stone-200 pt-6 dark:border-stone-800">
        <h2 className="self-start text-sm font-bold tracking-wide text-stone-900 uppercase dark:text-stone-50">
          Mapa por concelho
        </h2>
        <MapaConcelhosClient concelhosAtivos={concelhosAtivos} />
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> Corte programado (E-Redes)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400" /> Reportado pela comunidade
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-stone-300 bg-stone-100" /> Sem alertas
          </span>
        </p>
      </div>

      <Link
        href="/"
        className="self-start rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
      >
        Ver no mapa / reportar uma falha
      </Link>
    </div>
  );
}
