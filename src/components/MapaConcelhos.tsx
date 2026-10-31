"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents } from "react-leaflet";
import type { Layer, Path, PathOptions } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Droplet, ShieldCheck, Users, Clock } from "lucide-react";
import { paraSlug } from "@/lib/slug";
import { criarIconeAlerta } from "@/lib/icones-mapa";
import { formatarDataHora } from "@/lib/tempo";
import { registarAberturaMarcador } from "@/lib/analytics";
import type { AlertaMapaConcelho, ConcelhosAtivosPorOrigem } from "@/lib/alertas-server";

const LIMITES_PORTUGAL: [[number, number], [number, number]] = [
  [36.85, -9.6],
  [42.2, -6.1],
];

const LIMITES_MAXIMOS: [[number, number], [number, number]] = [
  [35.5, -12],
  [43.5, -5],
];

// O polígono é só o contorno/fundo neutro do concelho (clicável para
// navegar) — quem diz onde há alertas são só os pins, não o polígono
// também. Ter os dois a dizer a mesma coisa (amarelo + pins) era
// informação a dobrar sem necessidade.
const COR_FUNDO = "#f4f4f5";
const COR_FUNDO_LINHA = "#d4d4d8";

// A partir deste zoom há poucos concelhos visíveis de cada vez, por isso dá
// para escrever o nome de cada um sem o mapa ficar ilegível de texto. Em
// zonas densas (área metropolitana de Lisboa, por exemplo) muitos concelhos
// pequenos ficam lado a lado — por isso o limiar é alto, só liga os rótulos
// permanentes de TODOS quando já restam mesmo poucos à vista.
const ZOOM_MOSTRA_ROTULOS = 11;

// Limiar mais baixo, só para concelhos COM alertas — com a janela de 30
// dias pode haver uma dezena ou mais ao mesmo tempo espalhados pelo país,
// e se o rótulo deles ficasse ligado desde o zoom inicial (Portugal
// inteiro), as caixas de texto sobrepunham-se todas e ainda tapavam os
// pins por baixo. A partir deste zoom já se vê uma área mais pequena, por
// isso os rótulos cabem sem se amontoarem.
const ZOOM_MOSTRA_ROTULOS_ALERTAS = 9;

interface ConcelhoProperties {
  con_name: string;
  dis_name: string;
}

function SeguidorDeZoom({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) });
  return null;
}

function rotuloPermanente(temAlerta: boolean, zoom: number): boolean {
  if (zoom >= ZOOM_MOSTRA_ROTULOS) return true;
  return temAlerta && zoom >= ZOOM_MOSTRA_ROTULOS_ALERTAS;
}

export function MapaConcelhos({
  concelhosAtivos,
  pontos,
}: {
  concelhosAtivos: ConcelhosAtivosPorOrigem;
  pontos: AlertaMapaConcelho[];
}) {
  const [geojson, setGeojson] = useState<FeatureCollection<Geometry, ConcelhoProperties> | null>(null);
  const [zoom, setZoom] = useState(6);
  const router = useRouter();
  const oficiaisSlugs = new Set(concelhosAtivos.oficial.map(paraSlug));
  const comunidadeSlugs = new Set(concelhosAtivos.comunidade.map(paraSlug));
  const camadasRef = useRef<{ layer: Layer; nome: string; temAlerta: boolean }[]>([]);

  useEffect(() => {
    fetch("/data/concelhos.geojson")
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => setGeojson(null));
  }, []);

  // Alterna os rótulos permanentes quando o zoom cruza um dos dois
  // limiares — sem isto recriar a camada toda (308 polígonos) só para
  // mudar o texto.
  useEffect(() => {
    for (const { layer, nome, temAlerta } of camadasRef.current) {
      const permanente = rotuloPermanente(temAlerta, zoom);
      layer.unbindTooltip();
      layer.bindTooltip(nome, { sticky: !permanente, permanent: permanente, direction: "center", className: "rotulo-concelho" });
    }
  }, [zoom]);

  if (!geojson) {
    return (
      <div className="mx-auto flex h-[480px] w-[260px] items-center justify-center text-sm text-stone-500 sm:h-[600px] sm:w-[325px] lg:h-[700px] lg:w-[380px]">
        A carregar o mapa de concelhos…
      </div>
    );
  }

  // Mesmo estilo para todos os concelhos — a cor já não diz se há alertas
  // ou não (isso é com os pins). Transparente o suficiente para o mapa de
  // base (e os nomes de localidades dele) aparecer por baixo.
  const estilo = (): PathOptions => ({
    fillColor: COR_FUNDO,
    fillOpacity: 0.45,
    color: COR_FUNDO_LINHA,
    weight: 1,
  });

  const aoAdicionarFeature = (feature: Feature<Geometry, ConcelhoProperties>, layer: Layer) => {
    const nome = feature.properties.con_name;
    const slug = paraSlug(nome);
    const temAlerta = oficiaisSlugs.has(slug) || comunidadeSlugs.has(slug);
    const permanente = rotuloPermanente(temAlerta, zoom);
    layer.bindTooltip(nome, { sticky: !permanente, permanent: permanente, direction: "center", className: "rotulo-concelho" });
    camadasRef.current.push({ layer, nome, temAlerta });
    layer.on("click", () => router.push(`/cortes/${slug}`));
    layer.on("mouseover", () => (layer as Path).setStyle({ weight: 2.5 }));
    layer.on("mouseout", () => (layer as Path).setStyle({ weight: 1 }));
  };

  return (
    <div className="mx-auto h-[480px] w-[260px] overflow-hidden rounded-lg border border-stone-200 sm:h-[600px] sm:w-[325px] lg:h-[700px] lg:w-[380px] dark:border-stone-800">
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

        {/* Pins no sítio exato de cada alerta, mesmo visual do mapa da
            home — ao contrário do preenchimento do polígono acima, não
            dependem do nome do concelho bater certo com o GeoJSON, por
            isso aparecem no sítio certo mesmo quando a geocodificação
            devolve um nome ligeiramente diferente do nome oficial. */}
        {pontos.map((ponto) => (
          <Marker
            key={ponto.id}
            position={[ponto.latitude, ponto.longitude]}
            icon={criarIconeAlerta(ponto.tipo_servico, ponto.origem, ponto.estadoVisual)}
            eventHandlers={{
              popupopen: () => registarAberturaMarcador(ponto.tipo_servico, ponto.origem, ponto.estadoVisual),
            }}
          >
            <Popup>
              <div className="flex flex-col gap-1 text-sm">
                <strong className="flex items-center gap-1.5">
                  {ponto.tipo_servico === "luz" ? (
                    <Zap size={15} className="text-amber-500" aria-hidden />
                  ) : (
                    <Droplet size={15} className="text-sky-500" aria-hidden />
                  )}
                  {ponto.tipo_servico === "luz" ? "Falta de luz" : "Falta de água"}
                  {ponto.estadoVisual === "programado" && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      <Clock size={10} aria-hidden /> Programado
                    </span>
                  )}
                </strong>
                <span>
                  {ponto.concelho}
                  {ponto.freguesia ? ` — ${ponto.freguesia}` : ""}
                </span>
                <span className="flex items-center gap-1 text-xs text-stone-500">
                  {ponto.origem === "oficial" ? (
                    <ShieldCheck size={13} className="shrink-0" aria-hidden />
                  ) : (
                    <Users size={13} className="shrink-0" aria-hidden />
                  )}
                  {ponto.origem === "oficial" ? "Oficial E-REDES" : "Comunidade"}
                  {ponto.estadoVisual === "programado" && ponto.data_inicio && ` · começa ${formatarDataHora(ponto.data_inicio)}`}
                </span>
                <Link
                  href={`/cortes/${paraSlug(ponto.concelho)}`}
                  className="mt-1 text-xs font-semibold text-stone-700 underline dark:text-stone-300"
                >
                  Ver concelho
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}

        <SeguidorDeZoom onZoom={setZoom} />
      </MapContainer>
    </div>
  );
}
