"use client";

import { useState } from "react";
import { confirmarAlerta } from "@/lib/alertas";

export function BotaoConfirmar({ id }: { id: string }) {
  const [estado, setEstado] = useState<"por_clicar" | "a_enviar" | "confirmado" | "erro">("por_clicar");

  async function confirmar() {
    setEstado("a_enviar");
    try {
      await confirmarAlerta(id);
      setEstado("confirmado");
    } catch {
      setEstado("erro");
    }
  }

  if (estado === "confirmado") {
    return <span className="text-xs font-semibold text-green-700 dark:text-green-400">Confirmado — obrigado!</span>;
  }

  return (
    <button
      type="button"
      onClick={confirmar}
      disabled={estado === "a_enviar"}
      className="min-h-11 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-900"
    >
      {estado === "a_enviar" ? "A confirmar…" : "Eu também estou sem isto"}
      {estado === "erro" && " — tenta outra vez"}
    </button>
  );
}
