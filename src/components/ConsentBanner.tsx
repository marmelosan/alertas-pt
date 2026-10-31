"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

function gtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

const CHAVE = "alertas-pt:cookie-consent";

function lerEscolhaGuardada(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null; // localStorage pode falhar (modo privado, etc.)
  }
}

export function ConsentBanner() {
  const gtmAtivo = Boolean(process.env.NEXT_PUBLIC_GTM_ID);
  // Lido uma vez, de forma síncrona, no estado inicial — não precisa de
  // efeito nenhum para decidir se o banner aparece.
  const [visivel, setVisivel] = useState(
    () => gtmAtivo && !["granted", "denied"].includes(lerEscolhaGuardada() ?? "")
  );

  useEffect(() => {
    // Efeito só para sincronizar com o sistema externo (gtag) — não mexe em estado local.
    if (gtmAtivo && lerEscolhaGuardada() === "granted") {
      gtag("consent", "update", {
        ad_storage: "denied", // nunca usamos ads — só analytics
        analytics_storage: "granted",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    }
  }, [gtmAtivo]);

  function aceitar() {
    gtag("consent", "update", {
      ad_storage: "denied",
      analytics_storage: "granted",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    try {
      localStorage.setItem(CHAVE, "granted");
    } catch {}
    setVisivel(false);
  }

  function rejeitar() {
    try {
      localStorage.setItem(CHAVE, "denied");
    } catch {}
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[2000] flex flex-col items-center justify-between gap-3 border-t border-stone-200 bg-white p-4 shadow-lg sm:flex-row dark:border-stone-800 dark:bg-stone-950">
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Usamos analytics para perceber a utilização do site. Nada fica guardado até escolheres.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={rejeitar}
          className="min-h-11 rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-200"
        >
          Rejeitar
        </button>
        <button
          type="button"
          onClick={aceitar}
          className="min-h-11 rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
