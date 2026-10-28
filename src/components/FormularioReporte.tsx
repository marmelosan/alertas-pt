"use client";

import { useEffect, useState } from "react";
import type { TipoServico } from "@/types/alerta";
import { geocodificarInverso } from "@/lib/geo";

interface FormularioReporteProps {
  latitude: number;
  longitude: number;
  onConfirmar: (dados: {
    tipo_servico: TipoServico;
    concelho: string;
    freguesia?: string;
    descricao?: string;
  }) => Promise<void>;
  onCancelar: () => void;
}

export function FormularioReporte({
  latitude,
  longitude,
  onConfirmar,
  onCancelar,
}: FormularioReporteProps) {
  const [tipoServico, setTipoServico] = useState<TipoServico>("luz");
  const [concelho, setConcelho] = useState("");
  const [freguesia, setFreguesia] = useState("");
  const [descricao, setDescricao] = useState("");
  const [aGeocodificar, setAGeocodificar] = useState(true);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    geocodificarInverso(latitude, longitude)
      .then((loc) => {
        if (cancelado) return;
        setConcelho(loc.concelho);
        setFreguesia(loc.freguesia ?? "");
      })
      .catch(() => {
        if (!cancelado) setErro("Não consegui identificar o concelho automaticamente — preenche à mão.");
      })
      .finally(() => {
        if (!cancelado) setAGeocodificar(false);
      });

    return () => {
      cancelado = true;
    };
  }, [latitude, longitude]);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!concelho.trim()) {
      setErro("Indica pelo menos o concelho.");
      return;
    }
    setErro(null);
    setAEnviar(true);
    try {
      await onConfirmar({
        tipo_servico: tipoServico,
        concelho: concelho.trim(),
        freguesia: freguesia.trim() || undefined,
        descricao: descricao.trim() || undefined,
      });
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : "Não consegui guardar o alerta. Tenta outra vez.");
      setAEnviar(false);
    }
  }

  return (
    <form
      onSubmit={submeter}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Reportar falha</h3>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTipoServico("luz")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            tipoServico === "luz"
              ? "bg-amber-500 text-white"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          }`}
        >
          ⚡ Falta de luz
        </button>
        <button
          type="button"
          onClick={() => setTipoServico("agua")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            tipoServico === "agua"
              ? "bg-blue-500 text-white"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          }`}
        >
          💧 Falta de água
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Concelho {aGeocodificar && <span className="text-zinc-400">(a identificar…)</span>}
        </span>
        <input
          value={concelho}
          onChange={(e) => setConcelho(e.target.value)}
          placeholder="ex: Almada"
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Freguesia (opcional)</span>
        <input
          value={freguesia}
          onChange={(e) => setFreguesia(e.target.value)}
          placeholder="ex: Cacilhas"
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Nota (opcional)</span>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="ex: desde as 14h"
          maxLength={140}
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={aEnviar}
          className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {aEnviar ? "A enviar…" : "Reportar"}
        </button>
      </div>
    </form>
  );
}
