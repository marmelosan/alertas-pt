"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck, Users } from "lucide-react";
import { paraSlug } from "@/lib/slug";
import type { CartaoConcelho } from "@/lib/alertas-server";

export function PesquisaConcelhos({ cartoes }: { cartoes: CartaoConcelho[] }) {
  const [termo, setTermo] = useState("");

  const filtrados = useMemo(() => {
    const t = paraSlug(termo.trim());
    if (!t) return cartoes;
    return cartoes.filter((c) => paraSlug(c.concelho).includes(t));
  }, [cartoes, termo]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 focus-within:border-stone-900 focus-within:ring-2 focus-within:ring-stone-900/20 dark:border-stone-700 dark:bg-stone-900 dark:focus-within:border-stone-200 dark:focus-within:ring-stone-200/20">
        <Search size={16} className="shrink-0 text-stone-400" aria-hidden />
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Procurar concelho…"
          className="min-h-11 w-full bg-transparent text-base outline-none placeholder:text-stone-400"
        />
      </div>

      {filtrados.length === 0 && (
        <p className="text-sm text-stone-500 dark:text-stone-400">Nenhum concelho ativo corresponde a &quot;{termo}&quot;.</p>
      )}

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((c) => (
          <li key={c.concelho}>
            <Link
              href={`/cortes/${paraSlug(c.concelho)}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 px-3 py-2.5 text-sm hover:border-stone-400 dark:border-stone-800 dark:hover:border-stone-600"
            >
              <span className="font-medium text-stone-800 dark:text-stone-200">{c.concelho}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-stone-500">
                {c.oficial && <ShieldCheck size={13} aria-label="Corte oficial E-REDES" />}
                {c.comunidade && <Users size={13} aria-label="Reportado pela comunidade" />}
                <span className="rounded-full bg-stone-100 px-2 py-0.5 font-semibold dark:bg-stone-800">
                  {c.total}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
