"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Zap, Droplet, ShieldCheck, Users, Clock } from "lucide-react";
import { listarAlertasAtivos, listarCortesProgramados } from "@/lib/alertas";
import { estaPorConfirmar } from "@/lib/estado-alerta";
import { paraSlug } from "@/lib/slug";
import type { Alerta } from "@/types/alerta";

function tempoRelativo(iso: string): string {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return `há ${Math.round(horas / 24)} d`;
}

export function AlertasRecentesPainel({ mostrarTitulo = true }: { mostrarTitulo?: boolean }) {
  const [alertas, setAlertas] = useState<Alerta[] | null>(null);
  const [totalProgramados, setTotalProgramados] = useState(0);

  useEffect(() => {
    listarAlertasAtivos()
      .then((dados) => setAlertas(dados.slice(0, 8)))
      .catch(() => setAlertas([]));
    listarCortesProgramados()
      .then((dados) => setTotalProgramados(dados.length))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-3 px-2 py-6">
      {mostrarTitulo && (
        <h2 className="text-sm font-bold tracking-wide text-stone-900 uppercase dark:text-stone-50">
          Reportes recentes
        </h2>
      )}
      {alertas === null && (
        <ul className="flex flex-col gap-2" aria-label="A carregar reportes recentes">
          {[0, 1, 2].map((i) => (
            <li key={i} className="esqueleto flex items-center gap-2 px-1 py-1.5">
              <span className="h-4 w-4 shrink-0 rounded-full bg-stone-200 dark:bg-stone-800" />
              <span className="h-3 flex-1 rounded bg-stone-200 dark:bg-stone-800" />
              <span className="h-3 w-10 shrink-0 rounded bg-stone-200 dark:bg-stone-800" />
            </li>
          ))}
        </ul>
      )}
      {alertas?.length === 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {totalProgramados > 0 ? "Sem falhas em curso agora." : "Sem falhas em curso agora — boas notícias."}
          </p>
          {totalProgramados > 0 && (
            <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
              <Clock size={13} className="shrink-0" aria-hidden />
              Mas há {totalProgramados} {totalProgramados === 1 ? "corte programado" : "cortes programados"} pela
              E-Redes —{" "}
              <Link href="/cortes" className="font-semibold underline underline-offset-2">
                ver no mapa
              </Link>
              .
            </p>
          )}
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {alertas?.map((a) => {
          const Servico = a.tipo_servico === "luz" ? Zap : Droplet;
          const Origem = a.origem === "oficial" ? ShieldCheck : Users;
          const porConfirmar = estaPorConfirmar(a);
          return (
            <li key={a.id}>
              <Link
                href={`/cortes/${paraSlug(a.concelho)}`}
                className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm hover:border-stone-300 hover:bg-stone-50 dark:border-stone-800 dark:hover:border-stone-700 dark:hover:bg-stone-900"
              >
                <Servico
                  size={16}
                  className={`shrink-0 ${a.tipo_servico === "luz" ? "text-amber-500" : "text-sky-500"} ${porConfirmar ? "opacity-50" : ""}`}
                  aria-hidden
                />
                <span className="flex-1 truncate text-stone-700 dark:text-stone-300">
                  {a.freguesia ?? a.concelho}
                </span>
                {porConfirmar ? (
                  <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                    Por confirmar
                  </span>
                ) : (
                  a.origem === "comunidade" &&
                  a.contador_votos > 0 && (
                    <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">
                      {a.contador_votos} {a.contador_votos === 1 ? "confirmação" : "confirmações"}
                    </span>
                  )
                )}
                <Origem
                  size={13}
                  className="shrink-0 text-stone-500 dark:text-stone-400"
                  aria-label={a.origem === "oficial" ? "Oficial E-REDES" : "Comunidade"}
                />
                <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">
                  {tempoRelativo(a.criado_em)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
