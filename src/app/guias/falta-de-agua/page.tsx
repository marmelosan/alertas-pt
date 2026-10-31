import type { Metadata } from "next";
import Link from "next/link";
import { Droplet } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ChecklistImprimivel } from "@/components/ChecklistImprimivel";
import { Aviso112 } from "@/components/Aviso112";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

const TITULO = "O que fazer sem água | Foi Abaixo";
const DESCRICAO = "Guia prático: como confirmar a falha, guardar água, racionar e a quem ligar.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: `${SITE_URL}/guias/falta-de-agua` },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE_URL}/guias/falta-de-agua`,
    images: ["/opengraph-image"],
  },
  twitter: { title: TITULO, description: DESCRICAO },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "O que fazer quando falta a água",
  step: [
    { "@type": "HowToStep", name: "Confirma o alcance", text: "Verifica a torneira de corte e o contador — se for só tua casa, pode ser uma avaria interna, não da rede." },
    { "@type": "HowToStep", name: "Guarda água assim que souberes", text: "Enche garrafões, panelas e a banheira com água limpa antes de a canalização esvaziar de vez — sobretudo se souberes de um corte programado." },
    { "@type": "HowToStep", name: "Raciona", text: "Prioriza beber e cozinhar; deixa a limpeza e a descarga do autoclismo para último." },
    { "@type": "HowToStep", name: "Cuidado quando a água voltar", text: "Deixa a torneira correr uns segundos antes de beber — pode vir com ar ou sedimentos da reposição." },
    { "@type": "HowToStep", name: "Contacta os serviços municipais", text: "Liga à entidade de água da tua zona (SMAS do teu município, ou EPAL em Lisboa e Vale do Tejo)." },
    { "@type": "HowToStep", name: "Reporta", text: "Reporta no Foi Abaixo para ajudar quem está perto a confirmar a falha." },
  ],
};

export default function GuiaFaltaDeAgua() {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Breadcrumb trilha={[{ label: "Guias", href: "/guias" }, { label: "O que fazer sem água" }]} />

      <header className="flex items-center gap-2">
        <Droplet className="text-sky-500" size={24} aria-hidden />
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">O que fazer sem água</h1>
      </header>

      <Aviso112 />

      <div className="flex flex-col gap-4 text-stone-700 dark:text-stone-300">
        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">1. Confirma o alcance</h2>
          <p className="text-sm">
            Verifica a torneira de corte geral e o contador. Se for só a tua casa, pode ser uma avaria interna
            (tubo, torneira de corte fechada) e não uma falha da rede — nesse caso o mapa do Foi Abaixo não vai ajudar, precisas de um canalizador.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">2. Guarda água assim que souberes</h2>
          <p className="text-sm">
            Se souberes de um corte programado (ou já estiver em curso), enche garrafões, panelas grandes e, se precisares
            de mais, a banheira — antes de a água na canalização esgotar de vez.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">3. Raciona o que tens</h2>
          <p className="text-sm">
            Prioriza beber e cozinhar. Deixa a limpeza, a roupa e o autoclismo para último — uma descarga gasta vários litros.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">4. Cuidado quando a água voltar</h2>
          <p className="text-sm">
            Depois de um corte prolongado, deixa a torneira correr uns segundos antes de beber — pode vir com ar ou
            sedimentos soltos pela reposição da pressão na rede.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">5. Contacta os serviços municipais</h2>
          <p className="text-sm">
            Cada município tem a sua entidade de água (normalmente &ldquo;SMAS&rdquo; ou &ldquo;Águas do [concelho]&rdquo;); em Lisboa e Vale
            do Tejo é a EPAL. Procura o contacto específico da tua câmara municipal.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">6. Reporta a falha</h2>
          <p className="text-sm">
            Reporta no Foi Abaixo — ajuda quem está perto a confirmar que não é só em tua casa.
          </p>
        </section>
      </div>

      <ChecklistImprimivel
        titulo="Checklist: sem água"
        itens={[
          "Verificar torneira de corte e contador",
          "Encher garrafões, panelas e banheira assim que souberes",
          "Priorizar beber e cozinhar; deixar limpeza para último",
          "Deixar a torneira correr uns segundos quando a água voltar",
          "Contactar a entidade de água da zona (SMAS/EPAL)",
          "Reportar no Foi Abaixo",
        ]}
      />

      <Link
        href="/"
        className="self-start rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white print:hidden dark:bg-white dark:text-stone-900"
      >
        Reportar no mapa
      </Link>
    </div>
  );
}
