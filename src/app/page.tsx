import { MapaAlertasClient } from "@/components/MapaAlertasClient";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          ⚡💧 Alertas PT
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Falhas de água e luz em Portugal, reportadas pela comunidade e cruzadas com dados oficiais.
        </p>
      </header>
      <MapaAlertasClient />
    </div>
  );
}
