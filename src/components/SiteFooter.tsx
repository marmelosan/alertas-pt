import Link from "next/link";
import { Logo } from "@/components/Logo";

const NAVEGAR = [
  { href: "/", label: "Mapa" },
  { href: "/cortes", label: "Concelhos" },
  { href: "/guias", label: "Guias" },
  { href: "/faq", label: "FAQ" },
];

const LEGAL = [
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50 px-4 py-10 text-stone-600 print:hidden dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-stone-900 dark:text-stone-50">
            <Logo size={20} />
          </span>
          <p className="max-w-xs text-sm">
            Mapa colaborativo de falhas de água e eletricidade em Portugal, cruzado com dados oficiais da E-Redes.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-10 gap-y-6 text-sm sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-stone-900 dark:text-stone-50">Navegar</span>
            {NAVEGAR.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-stone-900 dark:hover:text-stone-50">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-stone-900 dark:text-stone-50">Legal</span>
            {LEGAL.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-stone-900 dark:hover:text-stone-50">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-5xl flex-col gap-1 border-t border-stone-200 pt-6 text-center text-xs text-stone-500 sm:text-left dark:border-stone-800">
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
            className="underline hover:text-stone-700 dark:hover:text-stone-300"
          >
            E-REDES – Distribuição de eletricidade, &ldquo;Portal Open Data E-REDES&rdquo;
          </a>
          , licença CC BY 4.0.
        </p>
      </div>
    </footer>
  );
}
