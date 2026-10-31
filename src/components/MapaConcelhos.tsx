"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from "react-leaflet";
import type { Layer, Path, PathOptions } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import { paraSlug } from "@/lib/slug";
import type { ConcelhosAtivosPorOrigem } from "@/lib/alertas-server";

const LIMITES_PORTUGAL: [[number, number], [number, number]] = [
  [36.85, -9.6],
  [42.2, -6.1],
];

const LIMITES_MAXIMOS: [[number, number], [number, number]] = [
  [35.5, -12],
  [43.5, -5],
];

const COR_OFICIAL = "#fbbf24";
const COR_OFICIAL_LINHA = "#b45309";
const COR_COMUNIDADE = "#c4b5fd";
const COR_COMUNIDADE_LINHA = "#6d28d9";
const COR_SEM_ALERTAS = "#f4f4f5";
const COR_SEM_ALERTAS_LINHA = "#d4d4d8";

// A partir deste zoom há poucos concelhos visíveis de cada vez, por isso dá
// para escrever o nome de cada um sem o mapa ficar ilegível de texto.
const ZOOM_MOSTRA_ROTULOS = 9;

interface ConcelhoProperties {
  con_name: string;
  dis_name: string;
}

function SeguidorDeZoom({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) });
  return null;
}

export function MapaConcelhos({ concelhosAtivos }: { concelhosAtivos: ConcelhosAtivosPorOrigem }) {
  const [geojson, setGeojson] = useState<FeatureCollection<Geometry, ConcelhoProperties> | null>(null);
  const [zoom, setZoom] = useState(6);
  const router = useRouter();
  const oficiaisSlugs = new Set(concelhosAtivos.oficial.map(paraSlug));
  const comunidadeSlugs = new Set(concelhosAtivos.comunidade.map(paraSlug));
  const camadasRef = useRef<{ layer: Layer; nome: string }[]>([]);

  useEffect(() => {
    fetch("/data/concelhos.geojson")
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => setGeojson(null));
  }, []);

  // Alterna os rótulos permanentes quando o zoom cruza o limiar — sem isto
  // recriar a camada toda (308 polígonos) só para mudar o texto.
  useEffect(() => {
    const mostrar = zoom >= ZOOM_MOSTRA_ROTULOS;
    for (const { layer, nome } of camadasRef.current) {
      layer.unbindTooltip();
      layer.bindTooltip(nome, { sticky: !mostrar, permanent: mostrar, direction: "center", className: "rotulo-concelho" });
    }
  }, [zoom]);

  if (!geojson) {
    return (
      <div className="mx-auto flex h-[300px] w-[160px] items-center justify-center text-sm text-stone-500 sm:h-[380px] sm:w-[205px] lg:h-[440px] lg:w-[235px]">
        A carregar o mapa de concelhos…
      </div>
    );
  }

  // Se um concelho tiver os dois (corte programado E reporte da comunidade),
  // o oficial ganha — é o dado confirmado pela E-Redes, mais certo que um reporte solto.
  const estilo = (feature?: Feature<Geometry, ConcelhoProperties>): PathOptions => {
    const slug = feature ? paraSlug(feature.properties.con_name) : "";
    const oficial = oficiaisSlugs.has(slug);
    const comunidade = comunidadeSlugs.has(slug);

    const fillColor = oficial ? COR_OFICIAL : comunidade ? COR_COMUNIDADE : COR_SEM_ALERTAS;
    const color = oficial ? COR_OFICIAL_LINHA : comunidade ? COR_COMUNIDADE_LINHA : COR_SEM_ALERTAS_LINHA;
    // Mais transparente quando não há nada a assinalar — deixa o mapa de
    // base (e os nomes de localidades dele) aparecer por baixo em vez de
    // ficar tapado por uma mancha sólida branca.
    const fillOpacity = oficial || comunidade ? 0.75 : 0.45;
    return { fillColor, fillOpacity, color, weight: 1 };
  };

  const aoAdicionarFeature = (feature: Feature<Geometry, ConcelhoProperties>, layer: Layer) => {
    const nome = feature.properties.con_name;
    layer.bindTooltip(nome, { sticky: true });
    camadasRef.current.push({ layer, nome });
    layer.on("click", () => router.push(`/cortes/${paraSlug(nome)}`));
    layer.on("mouseover", () => (layer as Path).setStyle({ weight: 2.5 }));
    layer.on("mouseout", () => (layer as Path).setStyle({ weight: 1 }));
  };

  return (
    <div className="mx-auto h-[300px] w-[160px] overflow-hidden rounded-lg border border-stone-200 sm:h-[380px] sm:w-[205px] lg:h-[440px] lg:w-[235px] dark:border-stone-800">
      <MapContainer
        bounds={LIMITES_PORTUGAL}
        maxBounds={LIMITES_MAXIMOS}
        minZoom={6}
        maxZoom={13}
        className="h-full w-full mapa-base-neutro"
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <GeoJSON data={geojson} style={estilo} onEachFeature={aoAdicionarFeature} />
        <SeguidorDeZoom onZoom={setZoom} />
      </MapContainer>
    </div>
  );
}
