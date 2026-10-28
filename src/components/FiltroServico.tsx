"use client";

import type { TipoServico } from "@/types/alerta";

interface FiltroServicoProps {
  valor: TipoServico | "todos";
  onChange: (valor: TipoServico | "todos") => void;
}

const OPCOES: { valor: TipoServico | "todos"; label: string; emoji: string }[] = [
  { valor: "todos", label: "Tudo", emoji: "🗺️" },
  { valor: "luz", label: "Luz", emoji: "⚡" },
  { valor: "agua", label: "Água", emoji: "💧" },
];

export function FiltroServico({ valor, onChange }: FiltroServicoProps) {
  return (
    <div className="flex gap-2">
      {OPCOES.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onChange(opcao.valor)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            valor === opcao.valor
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          {opcao.emoji} {opcao.label}
        </button>
      ))}
    </div>
  );
}
