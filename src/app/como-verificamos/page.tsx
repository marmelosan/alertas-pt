import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Users, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";
const TITULO = "Como verificamos | Foi Abaixo";
const DESCRICAO = "A regra das 2 confirmações, os estados de cada alerta, e de onde vêm os dados oficiais.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: `${SITE_URL}/como-verificamos` },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE_URL}/como-verificamos`,
    images: ["/opengraph-image"],
  },
  twitter: { title: TITULO, description: DESCRICAO },
};

const ESTADOS = [
  {
    icone: Users,
    cor: "text-stone-500",
    nome: "Por confirmar",
    descricao:
      "Alguém reportou uma falha, mas ainda só há 1 relato. Já aparece no mapa (para que outras pessoas na zona o possam confirmar), mas não conta como falha validada.",
  },
  {
    icone: CheckCircle2,
    cor: "text-green-600",
    nome: "Confirmado",
    descricao:
      "Pelo menos 2 relatos independentes da mesma zona, em janelas de tempo próximas. É o mínimo que exigimos antes de tratar um reporte da comunidade como fiável.",
  },
  {
    icone: ShieldCheck,
    cor: "text-sky-600",
    nome: "Oficial E-REDES",
    descricao:
      "Corte de luz programado, publicado diretamente pela E-Redes nos dados abertos deles — não depende de nenhuma confirmação da comunidade.",
  },
  {
    icone: Clock,
    cor: "text-amber-600",
    nome: "Resolvido",
    descricao:
      "Um corte oficial fica resolvido quando a E-Redes deixa de o listar. Um reporte da comunidade fica resolvido quando 2 pessoas independentes confirmam \"Já voltou?\", ou automaticamente 24h depois de criado.",
  },
];

export default function PaginaComoVerificamos() {
  return (
    <div className="mx-auto flex max-w-[680px] flex-1 flex-col gap-6 px-4 py-8">
      <Breadcrumb trilha={[{ label: "Como verificamos" }]} />

      <header>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Como verificamos cada alerta</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Não temos uma equipa a confirmar reportes manualmente — as regras abaixo são o que decide, de forma
          automática e igual para toda a gente, se um alerta aparece como confirmado.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold tracking-wide text-stone-900 uppercase dark:text-stone-50">
          Os 4 estados possíveis
        </h2>
        <ul className="flex flex-col gap-3">
          {ESTADOS.map((e) => {
            const Icone = e.icone;
            return (
              <li key={e.nome} className="flex gap-3 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
                <Icone size={18} className={`mt-0.5 shrink-0 ${e.cor}`} aria-hidden />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-50">{e.nome}</p>
                  <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">{e.descricao}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2 text-sm text-stone-700 dark:text-stone-300">
        <h2 className="text-sm font-bold tracking-wide text-stone-900 uppercase dark:text-stone-50">
          Localização aproximada, não exata
        </h2>
        <p className="flex items-start gap-2">
          <MapPin size={15} className="mt-0.5 shrink-0 text-stone-500" aria-hidden />
          Arredondamos a localização de cada reporte a cerca de 100 metros antes de a guardar. Mostra a rua/zona
          afetada, nunca a casa exata de quem reportou — detalhe completo na{" "}
          <Link href="/privacidade" className="font-semibold underline">
            página de privacidade
          </Link>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm text-stone-700 dark:text-stone-300">
        <h2 className="text-sm font-bold tracking-wide text-stone-900 uppercase dark:text-stone-50">
          De onde vêm os dados
        </h2>
        <p>
          Cortes de luz <strong>programados</strong> vêm diretamente do{" "}
          <a
            href="https://e-redes.opendatasoft.com/pages/homepage/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Portal Open Data E-REDES
          </a>{" "}
          (licença CC BY 4.0), sincronizados várias vezes por dia — estado ao vivo em{" "}
          <Link href="/estado" className="font-semibold underline">
            /estado
          </Link>
          . Avarias inesperadas de luz e qualquer falha de água vêm só de reportes diretos de quem está no terreno:
          não existe, para já, nenhum dataset público de avarias de água em Portugal que possamos integrar.
        </p>
      </section>

      <section className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
        <p>
          O Foi Abaixo é informação da comunidade e dados abertos — não substitui os canais oficiais. Para reportar
          ou confirmar uma avaria à E-Redes, liga a linha gratuita <strong>800 506 506</strong>. Em qualquer
          emergência, liga sempre o <strong>112</strong>.
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm text-stone-700 dark:text-stone-300">
        <h2 className="text-sm font-bold tracking-wide text-stone-900 uppercase dark:text-stone-50">Quem somos</h2>
        <p>
          O Foi Abaixo é um projeto pessoal e independente, sem fins lucrativos — não tem ligação à E-Redes nem a
          nenhuma entidade gestora de água. Mantido por uma pessoa, não por uma equipa.
          {/* TODO: substituir por nome/contacto reais antes de publicar, ou manter assim se preferires manter-te anónimo. */}
        </p>
      </section>

      <p className="text-sm text-stone-600 dark:text-stone-400">
        Mais perguntas na{" "}
        <Link href="/faq" className="font-semibold underline">
          página de FAQ
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
