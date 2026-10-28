"use client";

import dynamic from "next/dynamic";

// O Leaflet acede a `window` no import — tem de ficar fora do SSR.
const MapaAlertas = dynamic(
  () => import("@/components/MapaAlertas").then((m) => m.MapaAlertas),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        A carregar o mapa…
      </div>
    ),
  }
);

export function MapaAlertasClient() {
  return <MapaAlertas />;
}
