"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Alerta, TipoServico } from "@/types/alerta";
import { confirmarAlerta, denunciarAlerta, listarAlertasAtivos, reportarAlerta } from "@/lib/alertas";
import { registarEvento } from "@/lib/analytics";
import { FiltroServico } from "@/components/FiltroServico";
import { FormularioReporte } from "@/components/FormularioReporte";

const CENTRO_PORTUGAL: [number, number] = [39.5, -8.0];

const CORES: Record<TipoServico, string> = {
  luz: "#f59e0b",
  agua: "#3b82f6",
};

function criarIcone(tipo: TipoServico, origem: Alerta["origem"]) {
  const cor = CORES[tipo];
  // origem oficial = quadrado; comunidade = círculo — distinção visual rápida no mapa
  const forma =
    origem === "oficial"
      ? `width:14px;height:14px;border-radius:3px;`
      : `width:16px;height:16px;border-radius:50%;`;

  return L.divIcon({
    className: "",
    html: `<div style="${forma}background:${cor};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function tempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `há ${horas}h`;
}

/** Captura cliques no mapa — só ativo quando estamos em modo "reportar". */
function CapturarCliques({ ativo, onClique }: { ativo: boolean; onClique: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (ativo) onClique(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapaAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [filtro, setFiltro] = useState<TipoServico | "todos">("todos");
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modoReportar, setModoReportar] = useState(false);
  const [pontoPendente, setPontoPendente] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelado = false;

    listarAlertasAtivos()
      .then((dados) => {
        if (cancelado) return;
        setAlertas(dados);
        setErro(null);
      })
      .catch(() => {
        if (!cancelado) setErro("Não consegui carregar os alertas. Tenta recarregar a página.");
      })
      .finally(() => {
        if (!cancelado) setACarregar(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const alertasVisiveis = useMemo(
    () => (filtro === "todos" ? alertas : alertas.filter((a) => a.tipo_servico === filtro)),
    [alertas, filtro]
  );

  async function confirmar(id: string) {
    try {
      const atualizado = await confirmarAlerta(id);
      setAlertas((prev) => prev.map((a) => (a.id === id ? atualizado : a)));
      registarEvento("alerta_confirmado", { tipo_servico: atualizado.tipo_servico });
    } catch {
      setErro("Não consegui registar a confirmação.");
    }
  }

  async function denunciar(id: string) {
    try {
      const atualizado = await denunciarAlerta(id);
      setAlertas((prev) => prev.map((a) => (a.id === id ? atualizado : a)));
      registarEvento("alerta_denunciado", { tipo_servico: atualizado.tipo_servico });
    } catch {
      setErro("Não consegui registar a denúncia.");
    }
  }

  async function enviarReporte(dados: {
    tipo_servico: TipoServico;
    concelho: string;
    freguesia?: string;
    descricao?: string;
  }) {
    if (!pontoPendente) return;
    const novo = await reportarAlerta({
      ...dados,
      latitude: pontoPendente.lat,
      longitude: pontoPendente.lng,
    });
    setAlertas((prev) => [novo, ...prev]);
    setPontoPendente(null);
    setModoReportar(false);
    registarEvento("report_submitted", { tipo_servico: novo.tipo_servico, concelho: novo.concelho });
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="z-[1000] flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <FiltroServico valor={filtro} onChange={setFiltro} />
        <button
          type="button"
          onClick={() => {
            setModoReportar((v) => !v);
            setPontoPendente(null);
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            modoReportar
              ? "bg-red-600 text-white"
              : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
          }`}
        >
          {modoReportar ? "Cancelar reporte" : "🚨 Reportar falha"}
        </button>
      </div>

      {modoReportar && !pontoPendente && (
        <div className="z-[1000] bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Clica no mapa no sítio exato onde falta o serviço.
        </div>
      )}

      {erro && (
        <div className="z-[1000] bg-red-50 px-4 py-2 text-center text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {erro}
        </div>
      )}

      <div className="relative flex-1">
        <MapContainer center={CENTRO_PORTUGAL} zoom={7} className="absolute inset-0">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <CapturarCliques
            ativo={modoReportar && !pontoPendente}
            onClique={(lat, lng) => setPontoPendente({ lat, lng })}
          />

          {alertasVisiveis.map((alerta) => (
            <Marker
              key={alerta.id}
              position={[alerta.latitude, alerta.longitude]}
              icon={criarIcone(alerta.tipo_servico, alerta.origem)}
            >
              <Popup>
                <div className="flex flex-col gap-1 text-sm">
                  <strong>
                    {alerta.tipo_servico === "luz" ? "⚡ Falta de luz" : "💧 Falta de água"}
                  </strong>
                  <span>
                    {alerta.concelho}
                    {alerta.freguesia ? ` — ${alerta.freguesia}` : ""}
                  </span>
                  {alerta.descricao && <span className="text-zinc-600">{alerta.descricao}</span>}
                  <span className="text-xs text-zinc-500">
                    {tempoRelativo(alerta.criado_em)} ·{" "}
                    {alerta.origem === "oficial" ? "fonte oficial" : `${alerta.contador_votos} confirmações`}
                  </span>
                  {alerta.origem === "comunidade" && (
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => confirmar(alerta.id)}
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900"
                      >
                        Eu também estou sem isto
                      </button>
                      <button
                        type="button"
                        onClick={() => denunciar(alerta.id)}
                        className="text-xs text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        Não é verdade
                      </button>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {pontoPendente && (
          <div className="absolute bottom-4 left-1/2 z-[1000] w-[min(360px,90vw)] -translate-x-1/2">
            <FormularioReporte
              latitude={pontoPendente.lat}
              longitude={pontoPendente.lng}
              onConfirmar={enviarReporte}
              onCancelar={() => setPontoPendente(null)}
            />
          </div>
        )}

        {aCarregar && (
          <div className="absolute top-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-zinc-600 shadow dark:bg-zinc-900/90 dark:text-zinc-300">
            A carregar alertas…
          </div>
        )}
      </div>
    </div>
  );
}
