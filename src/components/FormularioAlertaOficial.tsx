"use client";

import { useState } from "react";
import Link from "next/link";

type Estado = "por_escrever" | "a_enviar" | "sucesso" | "erro";

export function FormularioAlertaOficial() {
  const [estado, setEstado] = useState<Estado>("por_escrever");
  const [erro, setErro] = useState<string | null>(null);

  async function submeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("a_enviar");
    setErro(null);

    const form = new FormData(e.currentTarget);
    const corpo = {
      tipo_servico: form.get("tipo_servico"),
      concelho: form.get("concelho"),
      freguesia: form.get("freguesia") || undefined,
      descricao: form.get("descricao") || undefined,
      latitude: Number(form.get("latitude")),
      longitude: Number(form.get("longitude")),
      data_inicio: form.get("data_inicio"),
      data_fim: form.get("data_fim") || undefined,
      external_id: form.get("external_id"),
    };

    try {
      const res = await fetch("/api/admin/inserir-oficial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const resposta = await res.json();
      if (!res.ok) {
        setErro(resposta.erro ?? "não consegui gravar");
        setEstado("erro");
        return;
      }
      setEstado("sucesso");
      (e.target as HTMLFormElement).reset();
    } catch {
      setErro("erro de rede");
      setEstado("erro");
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Inserir alerta oficial</h1>
        <Link href="/admin" className="text-sm text-stone-500 underline">
          ← voltar
        </Link>
      </div>
      <p className="text-sm text-stone-500">
        Para fontes de água sem adaptador automático ainda. Submeter com o mesmo <code>external_id</code> outra vez
        atualiza a linha em vez de duplicar.
      </p>

      <form onSubmit={submeter} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Tipo de serviço
          <select name="tipo_servico" required defaultValue="agua" className="min-h-11 rounded-lg border border-stone-300 px-3 dark:border-stone-700 dark:bg-stone-900">
            <option value="agua">Água</option>
            <option value="luz">Luz</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Concelho (nome oficial exato)
          <input name="concelho" required placeholder="ex.: Sardoal" className="min-h-11 rounded-lg border border-stone-300 px-3 dark:border-stone-700 dark:bg-stone-900" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Freguesia / localidade (opcional)
          <input name="freguesia" placeholder="ex.: São Simão" className="min-h-11 rounded-lg border border-stone-300 px-3 dark:border-stone-700 dark:bg-stone-900" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Descrição (opcional, até 140 carateres)
          <input name="descricao" maxLength={140} placeholder="ex.: Lavagem e higienização do reservatório" className="min-h-11 rounded-lg border border-stone-300 px-3 dark:border-stone-700 dark:bg-stone-900" />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Latitude
            <input name="latitude" type="number" step="any" required placeholder="39.9123" className="min-h-11 rounded-lg border border-stone-300 px-3 dark:border-stone-700 dark:bg-stone-900" />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Longitude
            <input name="longitude" type="number" step="any" required placeholder="-8.1234" className="min-h-11 rounded-lg border border-stone-300 px-3 dark:border-stone-700 dark:bg-stone-900" />
          </label>
        </div>
        <p className="-mt-2 text-xs text-stone-500">
          Dica: clica com o botão direito no sítio certo no Google Maps → aparece lá em baixo, pronto a copiar.
        </p>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Hora de início
            <input name="data_inicio" type="datetime-local" required className="min-h-11 rounded-lg border border-stone-300 px-3 dark:border-stone-700 dark:bg-stone-900" />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Hora de fim prevista (opcional)
            <input name="data_fim" type="datetime-local" className="min-h-11 rounded-lg border border-stone-300 px-3 dark:border-stone-700 dark:bg-stone-900" />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          external_id (identificador único — volta a usar o mesmo para corrigir esta entrada)
          <input name="external_id" required placeholder="ex.: manual:sardoal-2026-11-15" className="min-h-11 rounded-lg border border-stone-300 px-3 font-mono text-xs dark:border-stone-700 dark:bg-stone-900" />
        </label>

        <button
          type="submit"
          disabled={estado === "a_enviar"}
          className="min-h-11 rounded-lg bg-stone-900 px-3 font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-900"
        >
          {estado === "a_enviar" ? "A gravar…" : "Gravar alerta"}
        </button>

        {estado === "sucesso" && <p className="text-sm font-semibold text-green-700 dark:text-green-400">Gravado.</p>}
        {estado === "erro" && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
      </form>
    </div>
  );
}
