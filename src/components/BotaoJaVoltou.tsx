"use client";

import { useState } from "react";
import { marcarResolvidoAlerta } from "@/lib/alertas";

/** Bloco 14, Passo 2 — precisa de 2 cliques independentes para fechar o alerta, igual ao "Eu também estou sem isto". */
export function BotaoJaVoltou({ id }: { id: string }) {
  const [estado, setEstado] = useState<"por_clicar" | "a_enviar" | "registado" | "erro">("por_clicar");

  async function marcar() {
    setEstado("a_enviar");
    try {
      await marcarResolvidoAlerta(id);
      setEstado("registado");
    } catch {
      setEstado("erro");
    }
  }

  if (estado === "registado") {
    return <span className="text-xs font-semibold text-green-700 dark:text-green-400">Registado — obrigado!</span>;
  }

  return (
    <button
      type="button"
      onClick={marcar}
      disabled={estado === "a_enviar"}
      className="min-h-11 rounded-lg border border-stone-300 px-3 text-xs font-semibold text-stone-700 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
    >
      {estado === "a_enviar" ? "A registar…" : "Já voltou?"}
      {estado === "erro" && " — tenta outra vez"}
    </button>
  );
}
