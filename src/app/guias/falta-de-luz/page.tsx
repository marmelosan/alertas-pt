import type { Metadata } from "next";
import Link from "next/link";
import { Zap } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ChecklistImprimivel } from "@/components/ChecklistImprimivel";
import { Aviso112 } from "@/components/Aviso112";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

const TITULO = "O que fazer sem luz | Foi Abaixo";
const DESCRICAO = "Guia prático: como confirmar a falha, o que desligar, segurança e quando ligar à E-Redes.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: `${SITE_URL}/guias/falta-de-luz` },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE_URL}/guias/falta-de-luz`,
    images: ["/opengraph-image"],
  },
  twitter: { title: TITULO, description: DESCRICAO },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "O que fazer quando falta a luz",
  step: [
    { "@type": "HowToStep", name: "Confirma o alcance", text: "Verifica se é só em tua casa (disjuntor/quadro elétrico) ou se os vizinhos também estão sem luz." },
    { "@type": "HowToStep", name: "Desliga aparelhos sensíveis", text: "Desliga computadores, TVs e eletrodomésticos da tomada — evita picos de corrente quando a energia voltar." },
    { "@type": "HowToStep", name: "Mantém o frio", text: "Não abras o frigorífico/congelador sem necessidade — mantêm o frio várias horas fechados." },
    { "@type": "HowToStep", name: "Luz segura", text: "Usa lanternas ou luzes a pilhas em vez de velas — risco de incêndio." },
    { "@type": "HowToStep", name: "Nunca uses geradores dentro de casa", text: "Geradores a combustão libertam monóxido de carbono — usa sempre ao ar livre." },
    { "@type": "HowToStep", name: "Reporta", text: "Liga à E-Redes (800 506 506, grátis) e reporta no Foi Abaixo para ajudar quem está perto." },
  ],
};

export default function GuiaFaltaDeLuz() {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Breadcrumb trilha={[{ label: "Guias", href: "/guias" }, { label: "O que fazer sem luz" }]} />

      <header className="flex items-center gap-2">
        <Zap className="text-amber-500" size={24} aria-hidden />
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">O que fazer sem luz</h1>
      </header>

      <Aviso112 />

      <div className="flex flex-col gap-4 text-stone-700 dark:text-stone-300">
        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">1. Confirma o alcance</h2>
          <p className="text-sm">
            Verifica o quadro elétrico (disjuntores) — se um disjuntor desarmou, é um problema em casa, não da rede.
            Se estiver tudo normal lá, pergunta a um vizinho ou consulta o mapa do Foi Abaixo para veres se é uma falha mais alargada.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">2. Desliga aparelhos sensíveis</h2>
          <p className="text-sm">
            Desliga computadores, televisões e eletrodomésticos mais delicados da tomada. Quando a energia volta,
            pode haver um pico de corrente que danifica aparelhos ligados.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">3. Mantém o frio</h2>
          <p className="text-sm">
            Frigorífico e congelador mantêm a temperatura várias horas se não abrires a porta. Evita abrir sem necessidade.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">4. Luz segura</h2>
          <p className="text-sm">
            Prefere lanternas e luzes a pilhas a velas — reduz bastante o risco de incêndio, sobretudo com crianças ou animais em casa.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">5. Nunca uses geradores dentro de casa</h2>
          <p className="text-sm">
            Geradores a combustão (gasolina/gasóleo) libertam monóxido de carbono, um gás que não se vê nem cheira.
            Usa sempre ao ar livre, longe de janelas e portas.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">6. Reporta a falha</h2>
          <p className="text-sm">
            A E-Redes tem uma linha gratuita 24h: <strong>800 506 506</strong>. Reporta também no Foi Abaixo —
            ajuda quem está perto a confirmar que não é só em tua casa.
          </p>
        </section>
      </div>

      <ChecklistImprimivel
        titulo="Checklist: sem luz"
        itens={[
          "Verificar o quadro elétrico (disjuntores)",
          "Perguntar a vizinhos / consultar o Foi Abaixo",
          "Desligar computadores, TV e eletrodomésticos sensíveis",
          "Evitar abrir o frigorífico/congelador sem necessidade",
          "Preparar lanterna e pilhas (nunca velas sozinhas)",
          "Gerador só ao ar livre, nunca dentro de casa",
          "Ligar à E-Redes: 800 506 506",
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
