import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

const TITULO = "Termos e condições | Foi Abaixo";
const DESCRICAO = "Regras de utilização do Foi Abaixo — o que é, o que não é, e as regras para reportar.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: `${SITE_URL}/termos` },
  openGraph: { title: TITULO, description: DESCRICAO, url: `${SITE_URL}/termos`, images: ["/opengraph-image"] },
  twitter: { title: TITULO, description: DESCRICAO },
};

export default function PaginaTermos() {
  return (
    <div className="mx-auto flex max-w-[680px] flex-1 flex-col gap-6 px-4 py-8">
      <Breadcrumb trilha={[{ label: "Termos" }]} />

      <header>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Termos e condições</h1>
      </header>

      <div className="flex flex-col gap-5 text-sm text-stone-700 dark:text-stone-300">
        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">O que é o Foi Abaixo</h2>
          <p className="mt-1">
            Um mapa colaborativo de falhas de água e eletricidade em Portugal, feito a partir de reportes da
            comunidade cruzados com cortes de luz programados publicados pela E-Redes. Não é um serviço oficial da
            E-Redes, de nenhuma câmara municipal, nem de nenhuma entidade gestora de água.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Não substitui os canais oficiais</h2>
          <p className="mt-1">
            A informação aqui é partilhada pela comunidade e pode estar incompleta, desatualizada ou incorreta. Em
            situação de emergência, liga sempre o <strong>112</strong>. Para reportar avarias à E-Redes, usa a
            linha oficial <strong>800 506 506</strong>.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Reportar uma falha</h2>
          <p className="mt-1">
            Qualquer pessoa pode reportar uma falha, sem criar conta. Pedimos que reportes só falhas reais que
            estejas de facto a viver. Reportes falsos, repetidos ou feitos para prejudicar outra pessoa/entidade
            podem ser removidos, e o acesso a reportar pode ser limitado.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Como os reportes ganham confiança</h2>
          <p className="mt-1">
            Um reporte sozinho aparece marcado como &quot;por confirmar&quot; até receber pelo menos mais uma
            confirmação independente de outra pessoa — só depois conta como falha ativa confirmada. Qualquer
            reporte pode ser denunciado (&quot;Não é verdade&quot;); ao fim de 3 denúncias é removido
            automaticamente.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Sem garantias</h2>
          <p className="mt-1">
            O Foi Abaixo é fornecido &quot;tal como está&quot;, sem garantia de disponibilidade, exatidão ou
            atualidade dos dados — incluindo os dados oficiais da E-Redes, que dependem da disponibilização
            externa deles.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Dados pessoais</h2>
          <p className="mt-1">
            Ver a <Link href="/privacidade" className="underline">página de privacidade</Link> para detalhes
            sobre o que é guardado e durante quanto tempo.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Alterações</h2>
          <p className="mt-1">
            Estes termos podem ser atualizados à medida que o projeto evolui. A versão em vigor é sempre a
            publicada nesta página.
          </p>
        </section>
      </div>

      <Link
        href="/"
        className="self-start rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
      >
        Ver no mapa
      </Link>
    </div>
  );
}
