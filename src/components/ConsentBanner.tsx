"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// window.dataLayer já vem tipado pelo @next/third-parties/google.

// `...args` é só para o TypeScript validar as chamadas — o que é
// empurrado para o dataLayer tem de ser mesmo o objeto `arguments` em
// bruto, não um array (mesmo com o mesmo conteúdo), porque é o formato
// que o gtag.js/GTM espera para reconhecer isto como uma chamada
// gtag('consent', ...) e processá-la. É literalmente o padrão que a
// própria Google documenta para sites com GTM que chamam
// gtag('consent', ...) sem o gtag.js carregado.
function gtag(...args: unknown[]) {
  void args;
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

const CHAVE = "alertas-pt:cookie-consent";

/** Disparado pelo link "Preferências de cookies" (rodapé/Privacidade) para reabrir o aviso, mesmo já tendo escolhido antes. */
export const EVENTO_REABRIR_PREFERENCIAS = "abrir-preferencias-cookies";

function lerEscolhaGuardada(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null; // localStorage pode falhar (modo privado, etc.)
  }
}

function nenhumaEscolhaNoServidor(): null {
  return null; // não existe localStorage no servidor
}

function assinarAlteracoesDoStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function ConsentBanner() {
  const gtmAtivo = Boolean(process.env.NEXT_PUBLIC_GTM_ID);

  // useSyncExternalStore (em vez de ler o localStorage direto num useState
  // inicial) é o que garante que o servidor e a primeira passagem do
  // cliente veem sempre o mesmo valor (null, via getServerSnapshot) — ler
  // o localStorage logo ao início fazia o servidor e o cliente calcularem
  // visibilidades diferentes assim que já houvesse uma escolha guardada, o
  // que quebrava a hidratação do React nesse componente: o banner ficava
  // preso no ecrã tal como o servidor o desenhou, sem o React alguma vez
  // ligar os onClick por cima — parecia bloqueado, sem erro nenhum na
  // consola, e acontecia em qualquer browser (Chrome e Firefox incluídos).
  const escolhaGuardada = useSyncExternalStore(assinarAlteracoesDoStorage, lerEscolhaGuardada, nenhumaEscolhaNoServidor);

  const [fechado, setFechado] = useState(false);
  const [reaberto, setReaberto] = useState(false);

  useEffect(() => {
    if (gtmAtivo && escolhaGuardada === "granted") {
      gtag("consent", "update", {
        ad_storage: "denied", // nunca usamos ads — só analytics
        analytics_storage: "granted",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    }
  }, [gtmAtivo, escolhaGuardada]);

  // "Preferências de cookies" no rodapé/Privacidade reabre o aviso, para
  // quem queira mudar de ideias depois de já ter escolhido.
  useEffect(() => {
    if (!gtmAtivo) return;
    function reabrir() {
      setFechado(false);
      setReaberto(true);
    }
    window.addEventListener(EVENTO_REABRIR_PREFERENCIAS, reabrir);
    return () => window.removeEventListener(EVENTO_REABRIR_PREFERENCIAS, reabrir);
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
    setFechado(true);
  }

  function rejeitar() {
    gtag("consent", "update", {
      ad_storage: "denied",
      analytics_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    try {
      localStorage.setItem(CHAVE, "denied");
    } catch {}
    setFechado(true);
  }

  const semEscolhaAinda = !["granted", "denied"].includes(escolhaGuardada ?? "");
  const visivel = gtmAtivo && !fechado && (semEscolhaAinda || reaberto);

  if (!visivel) return null;

  // Botões com o mesmo peso visual de propósito (mesma cor, mesmo
  // contorno, mesmo tamanho) — "Aceitar" não é a opção em destaque.
  const estiloBotao =
    "min-h-11 flex-1 rounded-full border-2 border-stone-900 px-5 py-2 text-sm font-semibold text-stone-900 sm:flex-initial dark:border-stone-100 dark:text-stone-100";

  return (
    <div className="fixed inset-x-0 bottom-0 z-[2000] flex flex-col items-center justify-between gap-3 border-t border-stone-200 bg-white p-4 shadow-lg sm:flex-row dark:border-stone-800 dark:bg-stone-950">
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Usamos analytics para perceber a utilização do site. Nada fica guardado até escolheres.
      </p>
      <div className="flex w-full gap-2 sm:w-auto">
        <button type="button" onClick={rejeitar} className={estiloBotao}>
          Recusar
        </button>
        <button type="button" onClick={aceitar} className={estiloBotao}>
          Aceitar
        </button>
      </div>
    </div>
  );
}
