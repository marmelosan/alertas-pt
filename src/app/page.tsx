import { ChevronDown } from "lucide-react";
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
        <div className="border-b border-stone-200 px-4 py-3 dark:border-stone-800">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Foi abaixo aí também?</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Vê e avisa a tua zona — água e luz, cruzado com dados oficiais da E-Redes.
          </p>
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
