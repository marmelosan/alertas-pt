"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

/**
 * Aviso temporário para a tempestade de vento/chuva prevista para 11/11/2026
 * — do lado do cliente de propósito: a home é estática (sem revalidate), por
 * isso uma verificação de data no servidor ficaria "congelada" na hora do
 * deploy e nunca desapareceria sozinha depois da tempestade passar.
 */
const INICIO = new Date("2026-11-10T00:00:00");
const FIM = new Date("2026-11-12T23:59:59");

export function AvisoTempestade() {
  const agora = new Date();
  if (agora < INICIO || agora > FIM) return null;

  return (
    <div className="flex items-start gap-2 border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
      <p>
        <strong>Tempestade a caminho</strong> — chuva forte e vento até 140 km/h previstos para todo o continente. Usa
        &quot;Falta aqui agora&quot; no mapa para avisar se perderes luz ou água, e vê o{" "}
        <Link href="/guias/falta-de-luz" className="underline underline-offset-2">
          guia de falta de luz
        </Link>{" "}
        enquanto esperas.
      </p>
    </div>
  );
}
