import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/Breadcrumb";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

const TITULO = "Privacidade | Foi Abaixo";
const DESCRICAO = "O que guardamos quando reportas uma falha, durante quanto tempo, e o que nunca pedimos.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: `${SITE_URL}/privacidade` },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: `${SITE_URL}/privacidade`,
    images: ["/opengraph-image"],
  },
  twitter: { title: TITULO, description: DESCRICAO },
};

export default function PaginaPrivacidade() {
  return (
    <div className="mx-auto flex max-w-[680px] flex-1 flex-col gap-6 px-4 py-8">
      <Breadcrumb trilha={[{ label: "Privacidade" }]} />

      <header>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Privacidade</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Resumo curto: não pedimos conta, não sabemos quem és, e arredondamos a tua localização antes de a
          guardar. O resto desta página explica exatamente como.
        </p>
      </header>

      <div className="flex flex-col gap-5 text-sm text-stone-700 dark:text-stone-300">
        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">A tua localização</h2>
          <p className="mt-1">
            Quando reportas uma falha, a localização (clicada no mapa, ou obtida automaticamente com &quot;Falta
            aqui agora&quot;) é arredondada no nosso servidor a cerca de 100 metros antes de ser guardada — mostra
            a rua/zona, nunca a casa exata. A localização exata, antes de arredondada, nunca chega a ser guardada
            em lado nenhum.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">O que mais fica guardado</h2>
          <p className="mt-1">
            O tipo de falha (água/luz), o concelho e freguesia, uma nota opcional que escrevas, e um identificador
            aleatório gerado no teu telemóvel (guardado no armazenamento local do browser, não numa conta) — serve
            só para limitar quantos reportes podes enviar seguidos, para travar spam. Não pedimos nome, email,
            telefone, nem criamos nenhuma conta.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Endereço IP</h2>
          <p className="mt-1">
            Usamos o teu IP só no momento de reportares uma falha, para aplicar um segundo limite anti-spam (além
            do identificador do telemóvel). Nunca guardamos o IP em si — só uma versão encriptada (hash) dele, que
            não é reversível e é apagada ao fim de 24 horas.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Durante quanto tempo guardamos um reporte</h2>
          <p className="mt-1">
            Um reporte da comunidade fica visível como ativo durante 24 horas. Depois disso fica marcado como
            resolvido e continua visível como histórico na página do concelho durante 90 dias — findo esse prazo,
            é apagado definitivamente da base de dados.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Analytics</h2>
          <p className="mt-1">
            Só carregamos ferramentas de analytics depois de aceitares no aviso de cookies — por omissão, tudo vem
            desativado. Podes mudar de ideia a qualquer momento limpando os dados do site no teu browser.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Dados oficiais da E-Redes</h2>
          <p className="mt-1">
            Os cortes de luz programados vêm do{" "}
            <a
              href="https://e-redes.opendatasoft.com/pages/homepage/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Portal Open Data E-REDES
            </a>{" "}
            (licença CC BY 4.0) — dados públicos, sem informação pessoal.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-50">Denunciar um reporte</h2>
          <p className="mt-1">
            Se um reporte te parecer falso ou abusivo, usa o botão &quot;Não é verdade&quot; junto a esse alerta no
            mapa — ao fim de 3 denúncias, o alerta é removido automaticamente.
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
