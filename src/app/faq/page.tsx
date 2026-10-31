import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

const TITULO = "Perguntas frequentes | Foi Abaixo";
const DESCRICAO = "Como funciona o Foi Abaixo, privacidade, modo offline e tudo o que precisas de saber.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: { title: TITULO, description: DESCRICAO, url: `${SITE_URL}/faq`, images: ["/opengraph-image"] },
  twitter: { title: TITULO, description: DESCRICAO },
};

const FAQ = [
  {
    pergunta: "O que é o Foi Abaixo?",
    resposta:
      "Um mapa colaborativo que mostra falhas de água e eletricidade em Portugal em tempo real. Cruza cortes de luz programados pela E-Redes com reportes diretos de quem está no terreno.",
  },
  {
    pergunta: "Os dados são oficiais ou só de utilizadores?",
    resposta:
      "As duas coisas. Os cortes de luz programados vêm diretamente da E-Redes, atualizados automaticamente. Avarias de luz inesperadas, e qualquer falha de água, são reportadas pela comunidade — identificadas no mapa como vindas da comunidade.",
  },
  {
    pergunta: "Preciso de criar conta para reportar uma falha?",
    resposta:
      "Não. Basta carregar em \"Falta aqui agora\" ou clicar no mapa, escolher água ou luz, e enviar. Não pedimos registo nem email.",
  },
  {
    pergunta: "A minha localização exata fica visível para toda a gente?",
    resposta:
      "Não. Arredondamos a localização de cada reporte a cerca de 100 metros antes de a guardar — mostra a rua/zona, nunca a casa exata de quem reportou.",
  },
  {
    pergunta: "E se eu estiver sem internet no momento do corte?",
    resposta:
      "O site funciona offline para reportar: o teu alerta fica guardado no telemóvel e é enviado automaticamente assim que a ligação voltar.",
  },
  {
    pergunta: "Quanto tempo é que um reporte fica ativo?",
    resposta:
      "Um reporte da comunidade fica marcado como ativo durante 24 horas a partir do momento em que é enviado, mesmo sem confirmações novas. Um corte oficial da E-Redes fica ativo durante o período que a própria E-Redes indicar — antes de começar aparece como \"programado\".",
  },
  {
    pergunta: "Como são verificados os reportes da comunidade?",
    resposta:
      "Um reporte aparece no mapa assim que é enviado. Outras pessoas na zona podem confirmá-lo (\"Eu também estou sem isto\") ou denunciá-lo se parecer errado — ao fim de 3 denúncias, o alerta é retirado automaticamente do mapa.",
  },
];

const jsonLdFAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.pergunta,
    acceptedAnswer: { "@type": "Answer", text: f.resposta },
  })),
};

export default function PaginaFAQ() {
  return (
    <div className="mx-auto flex max-w-[680px] flex-1 flex-col gap-6 px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFAQ) }} />

      <Breadcrumb trilha={[{ label: "FAQ" }]} />

      <header>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Perguntas frequentes</h1>
      </header>

      <div className="flex flex-col divide-y divide-stone-200 dark:divide-stone-800">
        {FAQ.map((f) => (
          <details key={f.pergunta} className="group py-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-stone-800 dark:text-stone-200">
              {f.pergunta}
              <ChevronDown size={18} className="shrink-0 text-stone-400 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{f.resposta}</p>
          </details>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <Link href="/cortes" className="text-sm font-semibold text-stone-700 underline dark:text-stone-300">
          Ver todos os concelhos →
        </Link>
        <Link href="/guias" className="text-sm font-semibold text-stone-700 underline dark:text-stone-300">
          Guias: o que fazer sem luz/água →
        </Link>
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
