import Link from "next/link";
import { ShieldCheck, WifiOff, Lock, EyeOff, type LucideIcon } from "lucide-react";

const ITENS: { Icone: LucideIcon; titulo: string }[] = [
  { Icone: ShieldCheck, titulo: "Dados oficiais" },
  { Icone: WifiOff, titulo: "Funciona offline" },
  { Icone: Lock, titulo: "Localização privada" },
  { Icone: EyeOff, titulo: "Sem registo" },
];

/** Faixa compacta de confiança (Bloco 3 do briefing) — por baixo do mapa, em todos os tamanhos de ecrã. */
export function PainelConfianca() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400">
      {ITENS.map((item) => (
        <span key={item.titulo} className="flex items-center gap-1.5">
          <item.Icone size={14} className="shrink-0 text-stone-500 dark:text-stone-400" aria-hidden />
          {item.titulo}
        </span>
      ))}
      <Link href="/faq" className="font-semibold text-stone-700 underline hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-50">
        Saber mais
      </Link>
    </div>
  );
}
