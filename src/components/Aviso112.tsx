import { AlertTriangle } from "lucide-react";

export function Aviso112() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
      Informação partilhada pela comunidade e dados abertos da E-Redes. Não substitui os canais oficiais. Em
      emergência, liga <strong>112</strong>.
    </p>
  );
}
