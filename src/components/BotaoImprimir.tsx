"use client";

import { Printer } from "lucide-react";

export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 flex items-center gap-1.5 self-start rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 print:hidden dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-900"
    >
      <Printer size={16} aria-hidden /> Imprimir checklist
    </button>
  );
}
