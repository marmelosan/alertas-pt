import Link from "next/link";
import { Logo } from "@/components/Logo";

const ITENS = [
  { href: "/", label: "Mapa" },
  { href: "/cortes", label: "Concelhos" },
  { href: "/guias", label: "Guias" },
  { href: "/faq", label: "FAQ" },
];

export function SiteNav() {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-stone-200 px-4 py-3 print:hidden dark:border-stone-800">
      <Link href="/" className="shrink-0 text-base font-bold text-stone-900 sm:text-lg dark:text-stone-50">
        <Logo size={18} />
      </Link>
      <nav className="flex gap-0.5 sm:gap-1">
        {ITENS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="min-h-11 flex items-center rounded-full px-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 sm:px-3 sm:text-sm dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
