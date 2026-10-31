import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ChecklistImprimivel } from "@/components/ChecklistImprimivel";
import { Aviso112 } from "@/components/Aviso112";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

const TITULO = "Kit de emergência | Foi Abaixo";
const DESCRICAO = "O que vale a pena ter em casa preparado, antes de faltar a luz ou a água.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: `${SITE_URL}/guias/kit-de-emergencia` },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE_URL}/guias/kit-de-emergencia`,
    images: ["/opengraph-image"],
  },
  twitter: { title: TITULO, description: DESCRICAO },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Como preparar um kit de emergência em casa",
  step: [
    { "@type": "HowToStep", name: "Água", text: "Guarda uma reserva de água engarrafada em casa — regra geral, conta com cerca de 2 litros por pessoa por dia para beber." },
    { "@type": "HowToStep", name: "Luz e energia", text: "Lanterna, pilhas sobressalentes e uma bateria portátil (power bank) para o telemóvel, já carregada." },
    { "@type": "HowToStep", name: "Comida", text: "Alguma comida não perecível e fácil de preparar sem eletricidade (bolachas, conservas, fruta seca)." },
    { "@type": "HowToStep", name: "Primeiros socorros", text: "Estojo de primeiros socorros básico e os medicamentos de uso regular de quem vive em casa." },
    { "@type": "HowToStep", name: "Documentos e contactos", text: "Cópia dos documentos importantes e uma lista de contactos úteis escrita em papel (o telemóvel pode ficar sem bateria)." },
    { "@type": "HowToStep", name: "Dinheiro", text: "Algum dinheiro em numerário — sem luz, multibanco e terminais de pagamento também costumam ficar em baixo." },
  ],
};

export default function GuiaKitEmergencia() {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Breadcrumb trilha={[{ label: "Guias", href: "/guias" }, { label: "Kit de emergência" }]} />

      <header className="flex items-center gap-2">
        <Package className="text-stone-500" size={24} aria-hidden />
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Kit de emergência</h1>
      </header>

      <Aviso112 />

      <p className="text-sm text-stone-600 dark:text-stone-400">
        Não precisas de um bunker — só de ter à mão, num sítio fixo e conhecido por toda a gente em casa, o
        essencial para aguentar umas horas sem luz nem água sem stress.
      </p>

      <div className="flex flex-col gap-4 text-stone-700 dark:text-stone-300">
        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Água</h2>
          <p className="text-sm">
            Uma reserva de água engarrafada. Como regra geral, conta com cerca de 2 litros por pessoa por dia só
            para beber — mais se houver crianças, grávidas ou alguém doente em casa.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Luz e energia</h2>
          <p className="text-sm">
            Lanterna (não vela, pelo risco de incêndio), pilhas sobressalentes, e uma bateria portátil para o
            telemóvel já carregada — é o teu acesso ao Foi Abaixo e aos contactos de emergência.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Comida</h2>
          <p className="text-sm">
            Algo não perecível que não precise de cozinhar: bolachas, conservas, fruta seca, barras de cereais.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Primeiros socorros</h2>
          <p className="text-sm">
            Estojo básico (pensos, desinfetante, analgésicos) e os medicamentos de uso regular de quem vive em
            casa, com folga suficiente para alguns dias.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Documentos e contactos</h2>
          <p className="text-sm">
            Cópia dos documentos importantes, e uma lista de contactos úteis escrita em papel — com o telemóvel
            sem bateria, não há forma de consultar a agenda.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Dinheiro</h2>
          <p className="text-sm">
            Algum numerário guardado à parte. Sem energia, multibanco e terminais de pagamento também costumam
            deixar de funcionar.
          </p>
        </section>
      </div>

      <ChecklistImprimivel
        titulo="Checklist: kit de emergência"
        itens={[
          "Água engarrafada (~2L por pessoa/dia)",
          "Lanterna e pilhas sobressalentes",
          "Bateria portátil (power bank) carregada",
          "Comida não perecível, fácil de preparar",
          "Estojo de primeiros socorros + medicação regular",
          "Cópia de documentos importantes",
          "Lista de contactos úteis em papel",
          "Algum dinheiro em numerário",
        ]}
      />

      <Link
        href="/"
        className="self-start rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white print:hidden dark:bg-white dark:text-stone-900"
      >
        Ver no mapa
      </Link>
    </div>
  );
}
