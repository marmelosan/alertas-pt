"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Alerta } from "@/types/alerta";

function tempoRelativo(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  return `há ${Math.floor(minutos / 60)}h`;
}

export function PainelAdmin({ reportesIniciais }: { reportesIniciais: Alerta[] }) {
  const router = useRouter();
  const [reportes, setReportes] = useState(reportesIniciais);
  const [aProcessar, setAProcessar] = useState<string | null>(null);

  async function chamar(caminho: string, id: string) {
    setAProcessar(id);
    try {
      const res = await fetch(caminho, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return;
      if (caminho.includes("apagar")) {
        setReportes((prev) => prev.filter((r) => r.id !== id));
      } else {
        setReportes((prev) => prev.map((r) => (r.id === id ? { ...r, status: "resolvido" } : r)));
      }
    } finally {
      setAProcessar(null);
    }
  }

  async function sair() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">
          Backoffice — últimos {reportes.length} reportes da comunidade
        </h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/novo" className="text-sm underline">
            + Inserir alerta oficial
          </Link>
          <button onClick={sair} className="text-sm text-stone-500 underline">
            Sair
          </button>
        </div>
      </div>

      {reportes.length === 0 && <p className="text-stone-500">Sem reportes da comunidade para mostrar.</p>}

      <div className="flex flex-col gap-2">
        {reportes.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 p-3 text-sm dark:border-stone-800"
          >
            <div className="flex flex-col gap-0.5">
              <p className="font-semibold text-stone-900 dark:text-stone-50">
                {r.tipo_servico === "luz" ? "⚡" : "💧"} {r.concelho}
                {r.freguesia ? ` — ${r.freguesia}` : ""}
                {" · "}
                <span
                  className={
                    r.status === "resolvido" ? "text-stone-400" : "font-semibold text-amber-600 dark:text-amber-400"
                  }
                >
                  {r.status}
                </span>
              </p>
              <p className="text-xs text-stone-500">
                {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)} · {tempoRelativo(r.criado_em)} · {r.contador_votos}{" "}
                votos
              </p>
            </div>
            <div className="flex gap-2">
              {r.status !== "resolvido" && (
                <button
                  onClick={() => chamar("/api/admin/resolver", r.id)}
                  disabled={aProcessar === r.id}
                  className="min-h-9 rounded-lg border border-stone-300 px-3 text-xs font-semibold disabled:opacity-50 dark:border-stone-700"
                >
                  Marcar resolvido
                </button>
              )}
              <button
                onClick={() => chamar("/api/admin/apagar", r.id)}
                disabled={aProcessar === r.id}
                className="min-h-9 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
              >
                Apagar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
