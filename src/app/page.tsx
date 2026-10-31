import { ChevronDown, Zap, Droplet } from "lucide-react";
import { MapaAlertasClient } from "@/components/MapaAlertasClient";
import { PainelConfianca } from "@/components/PainelConfianca";
import { AlertasRecentesPainel } from "@/components/AlertasRecentesPainel";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

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

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 xl:gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSite) }} />

      <div className="flex w-full max-w-4xl flex-1 flex-col border-x border-stone-200 dark:border-stone-800">
        <div className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-br from-amber-50 via-white to-sky-50 px-4 py-8 sm:py-10 dark:border-stone-800 dark:from-amber-950/20 dark:via-stone-950 dark:to-sky-950/20">
          {/* Dois círculos desfocados, cor de cada serviço, só decorativos — dão profundidade ao fundo sem tapar o texto. */}
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/10" aria-hidden />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-500/10" aria-hidden />
          <div className="relative flex flex-col gap-2">
            <h1 className="flex items-center gap-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-50">
              <Zap size={28} className="shrink-0 fill-amber-500 text-amber-500" aria-hidden />
              <Droplet size={28} className="-ml-2 shrink-0 fill-sky-500 text-sky-500" aria-hidden />
              Foi abaixo aí também?
            </h1>
            <p className="max-w-md text-sm text-stone-600 sm:text-base dark:text-stone-400">
              Vê e avisa a tua zona — água e luz, cruzado com dados oficiais da E-Redes. Sem conta, sem apps, grátis.
            </p>
          </div>
        </div>
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
  );
}
