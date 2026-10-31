"use client";

import dynamic from "next/dynamic";
import type { ConcelhosAtivosPorOrigem } from "@/lib/alertas-server";

const MapaConcelhos = dynamic(
  () => import("@/components/MapaConcelhos").then((m) => m.MapaConcelhos),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto flex h-[300px] w-[160px] items-center justify-center text-sm text-stone-500 sm:h-[380px] sm:w-[205px] lg:h-[440px] lg:w-[235px]">
        A carregar o mapa de concelhos…
      </div>
    ),
  }
);

export function MapaConcelhosClient({ concelhosAtivos }: { concelhosAtivos: ConcelhosAtivosPorOrigem }) {
  return <MapaConcelhos concelhosAtivos={concelhosAtivos} />;
}
