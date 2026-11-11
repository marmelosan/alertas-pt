"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginAdmin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [estado, setEstado] = useState<"por_escrever" | "a_entrar" | "erro">("por_escrever");

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("a_entrar");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setEstado("erro");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setEstado("erro");
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Backoffice</h1>
      <form onSubmit={entrar} className="flex flex-col gap-3">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="min-h-11 rounded-lg border border-stone-300 px-3 dark:border-stone-700 dark:bg-stone-900"
        />
        <button
          type="submit"
          disabled={estado === "a_entrar" || password.length === 0}
          className="min-h-11 rounded-lg bg-stone-900 px-3 font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-900"
        >
          {estado === "a_entrar" ? "A entrar…" : "Entrar"}
        </button>
        {estado === "erro" && <p className="text-sm text-red-600 dark:text-red-400">Password incorreta.</p>}
      </form>
    </div>
  );
}
