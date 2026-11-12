import { ChevronDown, Zap, Droplet } from "lucide-react";
import { MapaAlertasClient } from "@/components/MapaAlertasClient";
import { PainelConfianca } from "@/components/PainelConfianca";
import { AlertasRecentesPainel } from "@/components/AlertasRecentesPainel";
import { AvisoTempestade } from "@/components/AvisoTempestade";
import { ResumoServidor } from "@/components/ResumoServidor";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

// Antes do ResumoServidor a home não lia nada do Supabase no servidor, por
// isso nunca precisou de revalidate — ficava estática desde o deploy sem
// problema nenhum porque não havia nada que pudesse ficar desatualizado.
// Agora há: sem isto, os números do ResumoServidor congelavam na hora do
// build e nunca mais se mexiam, dessincronizados do mapa/painéis (esses
// são client-side, pedem sempre dados frescos). Mesmo valor da página por
// concelho, para o ritmo de atualização ficar igual em todo o site.
export const revalidate = 300;

const jsonLdSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Foi Abaixo",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/cortes/{search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default async function Home() {
  return (
    <>
      <AvisoTempestade />
      <div className="mx-auto flex w-full max-w-7xl flex-1 xl:gap-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSite) }} />

        <div className="flex w-full max-w-4xl flex-1 flex-col border-x border-stone-200 dark:border-stone-800">
          {/*
            No telemóvel este cabeçalho fica deliberadamente pequeno (py-3, texto
            reduzido, tagline a uma linha só) — é o mapa que precisa do espaço
            vertical, que é escasso num ecrã de telemóvel e é precisamente o que
            quem está sem luz vai usar primeiro. A partir de sm: volta ao tamanho
            "de boas-vindas" normal, onde sobra espaço em altura.
          */}
          <div className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-br from-amber-50 via-white to-sky-50 px-4 py-3 sm:py-10 dark:border-stone-800 dark:from-amber-950/20 dark:via-stone-950 dark:to-sky-950/20">
            <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-300/25 blur-3xl sm:block dark:bg-amber-500/10 hidden" aria-hidden />
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-sky-300/25 blur-3xl sm:block dark:bg-sky-500/10 hidden" aria-hidden />
            <div className="relative flex flex-col gap-0.5 sm:gap-2">
              <h1 className="flex items-center gap-1 text-lg font-extrabold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-50">
                <Zap size={20} className="shrink-0 fill-amber-500 text-amber-500 sm:hidden" aria-hidden />
                <Zap size={28} className="hidden shrink-0 fill-amber-500 text-amber-500 sm:block" aria-hidden />
                <Droplet size={20} className="-ml-1.5 shrink-0 fill-sky-500 text-sky-500 sm:hidden" aria-hidden />
                <Droplet size={28} className="-ml-2 hidden shrink-0 fill-sky-500 text-sky-500 sm:block" aria-hidden />
                Foi abaixo aí também?
              </h1>
              <p className="line-clamp-1 max-w-md text-xs text-stone-600 sm:line-clamp-none sm:text-base dark:text-stone-400">
                Vê e avisa a tua zona — água e luz, cruzado com dados oficiais da E-Redes. Sem conta, sem apps, grátis.
              </p>
            </div>
          </div>
          <ResumoServidor />
          <MapaAlertasClient />
          <PainelConfianca />

          {/* Em ecrãs estreitos os "Reportes recentes" não têm coluna lateral — ficam aqui,
              fechados por omissão (como uma folha inferior simplificada, sem JS extra). */}
          <details className="group border-t border-stone-200 dark:border-stone-800 xl:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-stone-900 dark:text-stone-50">
              Reportes recentes
              <ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="px-2 pb-4">
              <AlertasRecentesPainel mostrarTitulo={false} />
            </div>
          </details>
        </div>

        <aside className="hidden w-80 shrink-0 xl:block">
          <div className="sticky top-4">
            <AlertasRecentesPainel />
          </div>
        </aside>
      </div>
    </>
  );
}
