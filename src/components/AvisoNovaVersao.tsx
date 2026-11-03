"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { EVENTO_NOVA_VERSAO } from "@/components/RegistarServiceWorker";

/**
 * Aviso para quem deixou o site aberto numa aba durante um deploy novo — o
 * service worker já assumiu o controlo (RegistarServiceWorker.tsx), mas o
 * React desta aba continua a correr o código antigo até recarregar. Pedimos
 * em vez de recarregar sozinhos para não perder um reporte a meio de
 * preenchimento.
 */
export function AvisoNovaVersao() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    function aoAvisar() {
      setVisivel(true);
    }
    window.addEventListener(EVENTO_NOVA_VERSAO, aoAvisar);
    return () => window.removeEventListener(EVENTO_NOVA_VERSAO, aoAvisar);
  }, []);

  if (!visivel) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[2100] flex items-center justify-center gap-3 bg-stone-900 px-4 py-2 text-center text-sm text-stone-50 shadow-lg dark:bg-stone-50 dark:text-stone-900">
      <span>Há uma versão nova do site — esta aba está desatualizada.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-semibold hover:bg-white/25 dark:bg-stone-900/10 dark:hover:bg-stone-900/20"
      >
        <RefreshCw size={13} aria-hidden /> Atualizar
      </button>
    </div>
  );
}
