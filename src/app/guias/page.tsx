import type { Metadata } from "next";
import Link from "next/link";
import { Zap, Droplet, Package } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

const TITULO = "Guias | Foi Abaixo";
const DESCRICAO = "O que fazer quando falta a luz ou a água em casa — guias práticos e de segurança.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: `${SITE_URL}/guias` },
  openGraph: { title: TITULO, description: DESCRICAO, url: `${SITE_URL}/guias`, images: ["/opengraph-image"] },
  twitter: { title: TITULO, description: DESCRICAO },
};

const GUIAS = [
  {
    slug: "falta-de-luz",
    titulo: "O que fazer sem luz",
    resumo: "Segurança, o que desligar, e quando ligar a E-Redes.",
    Icone: Zap,
    cor: "text-amber-500",
  },
  {
    slug: "falta-de-agua",
    titulo: "O que fazer sem água",
    resumo: "Como guardar água, racionar, e a quem ligar.",
    Icone: Droplet,
    cor: "text-sky-500",
  },
  {
    slug: "kit-de-emergencia",
    titulo: "Kit de emergência",
    resumo: "O que vale a pena ter em casa preparado, antes de a falha acontecer.",
    Icone: Package,
    cor: "text-stone-500",
  },
];

export default function PaginaGuias() {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <Breadcrumb trilha={[{ label: "Guias" }]} />

      <header>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Guias</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          O que fazer na prática quando falta a luz ou a água.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {GUIAS.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guias/${g.slug}`}
              className="flex items-center gap-3 rounded-xl border border-stone-200 p-4 hover:border-stone-400 dark:border-stone-800 dark:hover:border-stone-600"
            >
              <g.Icone className={`shrink-0 ${g.cor}`} size={22} aria-hidden />
              <div>
                <p className="font-semibold text-stone-900 dark:text-stone-50">{g.titulo}</p>
                <p className="text-sm text-stone-600 dark:text-stone-400">{g.resumo}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="self-start rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
      >
        Ver no mapa / reportar uma falha
      </Link>
    </div>
  );
}
