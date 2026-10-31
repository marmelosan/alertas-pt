import Link from "next/link";
import { Logo } from "@/components/Logo";

interface Segmento {
  label: string;
  href?: string;
}

/** `trilha` são os passos a seguir ao logótipo, ex.: [{label:"Guias", href:"/guias"}, {label:"O que fazer sem luz"}]. */
export function Breadcrumb({ trilha }: { trilha: Segmento[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-stone-500 print:hidden" aria-label="Localização atual">
      <Link href="/" className="font-semibold hover:underline">
        <Logo size={14} />
      </Link>
      {trilha.map((segmento) => (
        <span key={segmento.label} className="flex items-center gap-1.5">
          <span aria-hidden>/</span>
          {segmento.href ? (
            <Link href={segmento.href} className="hover:underline">
              {segmento.label}
            </Link>
          ) : (
            <span>{segmento.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
