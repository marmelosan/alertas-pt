"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErroConcelho({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[cortes/[concelho]]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col items-start gap-4 px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">
        Não consegui carregar esta página
      </h1>
      <p className="text-stone-600 dark:text-stone-400">
        Pode ser uma falha temporária a ir buscar os dados. Tenta outra vez.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
        >
          Tentar outra vez
        </button>
        <Link
          href="/"
          className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-200"
        >
          Voltar ao mapa
        </Link>
      </div>
    </div>
  );
}
