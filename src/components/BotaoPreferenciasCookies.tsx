"use client";

import { EVENTO_REABRIR_PREFERENCIAS } from "@/components/ConsentBanner";

/** Reabre o aviso de cookies para quem já escolheu antes e quer mudar de ideias. Usado no rodapé e na página de Privacidade. */
export function BotaoPreferenciasCookies({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENTO_REABRIR_PREFERENCIAS))}
      className={className ?? "text-left hover:text-stone-900 dark:hover:text-stone-50"}
    >
      Preferências de cookies
    </button>
  );
}
