"use client";

import { Map as MapIcon, Zap, Droplet, type LucideIcon } from "lucide-react";
import type { TipoServico } from "@/types/alerta";

interface FiltroServicoProps {
  valor: TipoServico | "todos";
  onChange: (valor: TipoServico | "todos") => void;
}

const OPCOES: { valor: TipoServico | "todos"; label: string; Icone: LucideIcon }[] = [
  { valor: "todos", label: "Tudo", Icone: MapIcon },
  { valor: "luz", label: "Luz", Icone: Zap },
  { valor: "agua", label: "Água", Icone: Droplet },
];

export function FiltroServico({ valor, onChange }: FiltroServicoProps) {
  return (
    <div className="flex gap-2">
      {OPCOES.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onChange(opcao.valor)}
          aria-pressed={valor === opcao.valor}
          className={`min-h-11 flex items-center gap-1 rounded-full px-2.5 py-2 text-xs font-semibold transition-colors sm:gap-1.5 sm:px-4 sm:text-sm ${
            valor === opcao.valor
              ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          }`}
        >
          <opcao.Icone size={16} aria-hidden />
          {opcao.label}
        </button>
      ))}
    </div>
  );
}
