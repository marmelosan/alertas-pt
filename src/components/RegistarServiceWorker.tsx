"use client";

import { useEffect } from "react";

/** Disparado quando uma versão nova do service worker assume o controlo desta aba. */
export const EVENTO_NOVA_VERSAO = "nova-versao-disponivel";

export function RegistarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Só conta como "versão nova" se esta aba JÁ estava a ser controlada por
    // um service worker antes de registarmos — numa aba limpa (sem SW
    // nenhum ainda), o primeiro registo também dispara "controllerchange"
    // quando o clients.claim() a reclama, mas isso não é uma atualização a
    // sério, é só o arranque normal. Sem esta distinção, toda a gente via o
    // aviso logo na primeira visita, por engano.
    const jaTinhaControlador = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker.register("/sw.js").catch(() => {});

    // sw.js chama skipWaiting()+clients.claim() em cada deploy, por isso uma
    // versão nova assume o controlo de abas já abertas sem precisarem de
    // fechar/reabrir — mas o React já carregado nessa aba continua a correr
    // o código antigo até haver um reload de verdade. Sem isto, quem deixa
    // o site aberto durante uma falha fica preso numa versão desatualizada
    // (foi assim que apanhámos o bug do banner de cookies a não responder).
    let jaAvisou = false;
    function aoTrocarController() {
      if (jaAvisou || !jaTinhaControlador) return;
      jaAvisou = true;
      window.dispatchEvent(new CustomEvent(EVENTO_NOVA_VERSAO));
    }
    navigator.serviceWorker.addEventListener("controllerchange", aoTrocarController);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", aoTrocarController);
  }, []);

  return null;
}
