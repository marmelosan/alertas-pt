"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { pesquisarLocais, type ResultadoBusca } from "@/lib/geo";

interface BuscaLocalProps {
  onSelecionar: (local: ResultadoBusca) => void;
}

export function BuscaLocal({ onSelecionar }: BuscaLocalProps) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [aberto, setAberto] = useState(false);
  const [aPesquisar, setAPesquisar] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (temporizador.current) clearTimeout(temporizador.current);

    // debounce — não martela a Nominatim a cada letra escrita, e também
    // cobre o caso de apagar o texto (limpa os resultados sem pesquisar)
    temporizador.current = setTimeout(() => {
      if (termo.trim().length < 2) {
        setResultados([]);
        return;
      }

      setAPesquisar(true);
      pesquisarLocais(termo)
        .then((r) => {
          setResultados(r);
          setAberto(true);
        })
        .catch(() => setResultados([]))
        .finally(() => setAPesquisar(false));
    }, 450);

    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [termo]);

  function selecionar(r: ResultadoBusca) {
    onSelecionar(r);
    setTermo(r.nome.split(",")[0]);
    setAberto(false);
    setResultados([]);
  }

  return (
    <div className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 focus-within:border-stone-900 focus-within:ring-2 focus-within:ring-stone-900/20 dark:border-stone-700 dark:bg-stone-900 dark:focus-within:border-stone-200 dark:focus-within:ring-stone-200/20">
        <Search aria-hidden size={16} className="shrink-0 text-stone-400" />
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onFocus={() => resultados.length > 0 && setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          placeholder="Procurar concelho, vila ou rua…"
          className="min-h-11 w-full bg-transparent text-base outline-none placeholder:text-stone-400"
        />
      </div>

      {aberto && (
        <ul className="absolute top-full left-0 z-[1100] mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {aPesquisar && (
            <li className="flex items-center gap-1.5 px-4 py-2 text-sm text-stone-400">
              <Loader2 size={14} className="animate-spin" aria-hidden /> A procurar…
            </li>
          )}
          {!aPesquisar && resultados.length === 0 && (
            <li className="px-4 py-2 text-sm text-stone-400">Sem resultados.</li>
          )}
          {resultados.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // evita o onBlur fechar antes do clique
                onClick={() => selecionar(r)}
                className="block w-full px-4 py-2.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                {r.nome}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
