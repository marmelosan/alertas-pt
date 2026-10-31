"use client";

import dynamic from "next/dynamic";
import type { AlertaMapaConcelho, ConcelhosAtivosPorOrigem } from "@/lib/alertas-server";

const MapaConcelhos = dynamic(
  () => import("@/components/MapaConcelhos").then((m) => m.MapaConcelhos),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto flex h-[480px] w-[260px] items-center justify-center text-sm text-stone-500 sm:h-[600px] sm:w-[325px] lg:h-[700px] lg:w-[380px]">
        A carregar o mapa de concelhos…
      </div>
    ),
  }
);

export function MapaConcelhosClient({
  concelhosAtivos,
  pontos,
}: {
  concelhosAtivos: ConcelhosAtivosPorOrigem;
  pontos: AlertaMapaConcelho[];
}) {
  return <MapaConcelhos concelhosAtivos={concelhosAtivos} pontos={pontos} />;
}
