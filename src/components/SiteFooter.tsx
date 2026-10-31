import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-1 border-t border-stone-200 px-4 py-3 text-center text-xs text-stone-500 print:hidden dark:border-stone-800 dark:text-stone-400">
      <p>
        Informação partilhada pela comunidade e dados abertos da E-Redes. Não substitui os canais oficiais. Em
        emergência, liga <strong>112</strong>.
      </p>
      <p>
        Cortes programados de eletricidade:{" "}
        <a
          href="https://e-redes.opendatasoft.com/pages/homepage/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-stone-600 dark:hover:text-stone-300"
        >
          E-REDES – Distribuição de eletricidade, &ldquo;Portal Open Data E-REDES&rdquo;
        </a>
        , licença CC BY 4.0.
      </p>
      <p className="flex items-center justify-center gap-3">
        <Link href="/privacidade" className="underline hover:text-stone-600 dark:hover:text-stone-300">
          Privacidade
        </Link>
        <Link href="/termos" className="underline hover:text-stone-600 dark:hover:text-stone-300">
          Termos
        </Link>
      </p>
    </footer>
  );
}
