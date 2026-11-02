"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { MapPin, Map as MapIcon, MousePointerClick, CheckCircle2, X, Loader2, Zap, Droplet, Share2, Check, WifiOff, ShieldCheck, Users, Clock, ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import type { Alerta, TipoServico } from "@/types/alerta";
import {
  confirmarAlerta,
  denunciarAlerta,
  listarAlertasAtivos,
  listarCortesProgramados,
  obterEstadoServico,
  reportarAlerta,
  type EstadoServico,
} from "@/lib/alertas";
import { processarFila } from "@/lib/fila-offline";
import { estaPorConfirmar, estaProgramadoHoje } from "@/lib/estado-alerta";
import { criarIconeAlerta, type EstadoVisualMarcador } from "@/lib/icones-mapa";
import { tempoRelativo, formatarDataHora } from "@/lib/tempo";
import {
  registarEvento,
  registarInicioReporte,
  registarReporteEnviado,
  registarReporteEmFilaOffline,
  registarReportesSincronizados,
  registarErroReporte,
  registarCliqueLocalizarMe,
  registarAberturaMarcador,
  registarFiltroUsado,
  registarPesquisaUsada,
} from "@/lib/analytics";
import { FiltroServico } from "@/components/FiltroServico";
import { FormularioReporte } from "@/components/FormularioReporte";
import { BuscaLocal } from "@/components/BuscaLocal";
import type { ResultadoBusca } from "@/lib/geo";
import { paraSlug } from "@/lib/slug";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

// Caixa que enquadra Portugal continental — usada em vez de um center+zoom
// fixo, que em ecrãs largos acabava por mostrar mais Espanha que Portugal.
const LIMITES_PORTUGAL: [[number, number], [number, number]] = [
  [36.85, -9.6], // sudoeste (perto de Sagres)
  [42.2, -6.1], // nordeste (perto de Bragança)
];

// Fora disto não há dados nenhuns — evita que a pessoa se perca a arrastar
// o mapa para o meio do Atlântico ou de Espanha.
const LIMITES_MAXIMOS: [[number, number], [number, number]] = [
  [35.5, -12],
  [43.5, -5],
];

type EstadoVisual = EstadoVisualMarcador;
type AlertaComEstado = Alerta & { estadoVisual: EstadoVisual };

/** Captura cliques no mapa — só ativo quando estamos em modo "reportar". */
function CapturarCliques({ ativo, onClique }: { ativo: boolean; onClique: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (ativo) onClique(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Centra o mapa num ponto (usado por "Falta aqui agora", clique ou pesquisa). */
function CentrarMapa({ coord }: { coord: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (coord) map.setView([coord.lat, coord.lng], 15);
  }, [coord, map]);
  return null;
}

/** Volta à vista de Portugal inteiro — incrementa `gatilho` para disparar. */
function VerPortugalTodo({ gatilho }: { gatilho: number }) {
  const map = useMap();
  useEffect(() => {
    if (gatilho > 0) map.fitBounds(LIMITES_PORTUGAL);
  }, [gatilho, map]);
  return null;
}

/**
 * O contentor do mapa muda de altura sempre que uma faixa acima dele
 * aparece/desaparece (ex.: a instrução "Clica no mapa..." some quando se
 * está a reportar, e volta ao cancelar). O Leaflet guarda o tamanho do
 * mapa em cache e não deteta essas mudanças de CSS sozinho — fica com os
 * tiles desalinhados ou em branco até algo chamar `invalidateSize()`.
 * Um ResizeObserver no próprio contentor trata disto para qualquer
 * mudança de layout, não só o caso de reportar/cancelar.
 */
function AjustaTamanho() {
  const map = useMap();
  useEffect(() => {
    const contentor = map.getContainer();
    const observador = new ResizeObserver(() => map.invalidateSize());
    observador.observe(contentor);
    return () => observador.disconnect();
  }, [map]);
  return null;
}

export function MapaAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [programados, setProgramados] = useState<Alerta[]>([]);
  const [filtro, setFiltro] = useState<TipoServico | "todos">("todos");
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "sucesso" | "offline"; texto: string } | null>(null);
  const [linkCopiadoId, setLinkCopiadoId] = useState<string | null>(null);
  const [pontoPendente, setPontoPendente] = useState<{ lat: number; lng: number } | null>(null);
  const [foco, setFoco] = useState<{ lat: number; lng: number } | null>(null);
  const [resetContagem, setResetContagem] = useState(0);
  const [aLocalizar, setALocalizar] = useState(false);
  const [estado, setEstado] = useState<EstadoServico | null>(null);
  const [erroEstado, setErroEstado] = useState(false);
  // Pesquisa e legenda escondidas por omissão só no telemóvel (onde o
  // espaço vertical é precioso e o mapa precisa dele mais do que elas) —
  // a partir de sm: ficam sempre visíveis, independente destes estados.
  const [pesquisaAberta, setPesquisaAberta] = useState(false);
  const [legendaAberta, setLegendaAberta] = useState(false);

  // o aviso desaparece sozinho ao fim de uns segundos — não obriga a pessoa a fechar à mão
  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  useEffect(() => {
    let cancelado = false;

    Promise.all([listarAlertasAtivos(), listarCortesProgramados()])
      .then(([ativos, programadosEmBreve]) => {
        if (cancelado) return;
        setAlertas(ativos);
        setProgramados(programadosEmBreve);
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

  useEffect(() => {
    let cancelado = false;
    obterEstadoServico()
      .then((dados) => !cancelado && setEstado(dados))
      .catch(() => !cancelado && setErroEstado(true));
    return () => {
      cancelado = true;
    };
  }, [alertas]);

  // Reenvia sozinho o que ficou em fila offline — ao abrir a página e
  // sempre que a ligação voltar (é precisamente durante um corte real
  // que a rede do telemóvel também costuma falhar).
  useEffect(() => {
    function tentarEnviarFila() {
      processarFila().then(({ enviados }) => {
        if (enviados > 0) {
          setAviso({
            tipo: "sucesso",
            texto: `${enviados} ${enviados === 1 ? "reporte enviado" : "reportes enviados"} agora que há ligação.`,
          });
          registarReportesSincronizados(enviados);
          listarAlertasAtivos()
            .then(setAlertas)
            .catch(() => {});
        }
      });
    }

    tentarEnviarFila();
    window.addEventListener("online", tentarEnviarFila);
    return () => window.removeEventListener("online", tentarEnviarFila);
  }, []);

  const alertasVisiveis = useMemo(
    () => (filtro === "todos" ? alertas : alertas.filter((a) => a.tipo_servico === filtro)),
    [alertas, filtro]
  );

  // Só os programados de HOJE ganham pin no mapa da home — os de outros
  // dias já estão todos em /cortes ("alertas programados"), e põe-los
  // também aqui só sobrecarregava o mapa principal com coisas que só vão
  // acontecer daqui a uma ou duas semanas. O aviso em baixo (com o link
  // para /cortes) continua a avisar do panorama completo.
  const programadosVisiveis = useMemo(() => {
    const agora = new Date();
    const deHoje = programados.filter((a) => estaProgramadoHoje(a, agora));
    return filtro === "todos" ? deHoje : deHoje.filter((a) => a.tipo_servico === filtro);
  }, [programados, filtro]);

  // Os dois juntos, cada um já rotulado com o estado que decide o visual
  // (ícone + conteúdo do popup) — evita recalcular "por confirmar" em
  // cada marcador individualmente dentro do JSX.
  const marcadores = useMemo((): AlertaComEstado[] => {
    const agora = new Date();
    const ativosEPorConfirmar = alertasVisiveis.map((a) => ({
      ...a,
      estadoVisual: (estaPorConfirmar(a, agora) ? "por_confirmar" : "ativo") as EstadoVisual,
    }));
    const programadosMarcados = programadosVisiveis.map((a) => ({
      ...a,
      estadoVisual: "programado" as EstadoVisual,
    }));
    return [...ativosEPorConfirmar, ...programadosMarcados];
  }, [alertasVisiveis, programadosVisiveis]);

  // Resumo por concelho para o aviso acima do mapa — não é preciso mostrar
  // cada corte um a um aqui (isso já existe em detalhe em /cortes), só dar
  // a indicação de que há algo agendado e onde.
  const concelhosProgramados = useMemo(() => {
    const unicos = [...new Set(programados.map((a) => a.concelho))];
    return unicos.sort((a, b) => a.localeCompare(b, "pt"));
  }, [programados]);

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

  /** Partilha o alerta (Web Share API no telemóvel, copia o link no desktop). */
  async function partilhar(alerta: Alerta) {
    const url = `${SITE_URL}/cortes/${paraSlug(alerta.concelho)}`;
    const texto =
      alerta.tipo_servico === "luz"
        ? `Falta de luz em ${alerta.freguesia ?? alerta.concelho} — confirma no Foi Abaixo`
        : `Falta de água em ${alerta.freguesia ?? alerta.concelho} — confirma no Foi Abaixo`;

    registarEvento("alerta_partilhado", { tipo_servico: alerta.tipo_servico });

    if (navigator.share) {
      try {
        await navigator.share({ title: "Foi Abaixo", text: texto, url });
      } catch {
        // pessoa cancelou a partilha — não é um erro
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(`${texto}: ${url}`);
      setLinkCopiadoId(alerta.id);
      setTimeout(() => setLinkCopiadoId(null), 2000);
    } catch {
      setErro("Não consegui copiar o link.");
    }
  }

  /** Reporte de um toque: usa a localização do telemóvel em vez de ter de clicar no mapa. */
  function reportarAqui() {
    setErro(null);
    registarCliqueLocalizarMe();

    if (!navigator.geolocation) {
      setErro("O teu browser não suporta localização — clica no mapa no sítio exato em vez disso.");
      return;
    }

    setALocalizar(true);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setALocalizar(false);
        const coord = { lat: posicao.coords.latitude, lng: posicao.coords.longitude };
        setPontoPendente(coord);
        setFoco(coord);
        registarEvento("localizacao_usada");
        registarInicioReporte("localizacao");
      },
      (erroGeo) => {
        setALocalizar(false);
        setErro(
          erroGeo.code === erroGeo.PERMISSION_DENIED
            ? "Não autorizaste a localização. Clica no mapa no sítio exato em vez disso."
            : "Não consegui obter a tua localização. Clica no mapa no sítio exato em vez disso."
        );
        registarErroReporte("geolocalizacao");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function selecionarBusca(local: ResultadoBusca) {
    setFoco({ lat: local.latitude, lng: local.longitude });
    registarPesquisaUsada();
  }

  async function enviarReporte(dados: {
    tipo_servico: TipoServico;
    concelho: string;
    freguesia?: string;
    descricao?: string;
  }) {
    if (!pontoPendente) return;
    const resultado = await reportarAlerta({
      ...dados,
      latitude: pontoPendente.lat,
      longitude: pontoPendente.lng,
    });
    setPontoPendente(null);

    if (resultado.tipo === "offline") {
      setAviso({
        tipo: "offline",
        texto: "Sem ligação: o teu reporte fica guardado e é enviado quando houver rede.",
      });
      registarReporteEmFilaOffline(dados.tipo_servico);
      return;
    }

    setAlertas((prev) => [resultado.alerta, ...prev]);
    setAviso({ tipo: "sucesso", texto: "Reportado! Obrigado — já aparece no mapa." });
    registarReporteEnviado(resultado.alerta.tipo_servico, resultado.alerta.concelho);
  }

  return (
    // min-h-[70dvh] no telemóvel garante que este bloco todo (barras + mapa)
    // ocupa a maior parte do ecrã visível, mesmo com tudo o que vem antes
    // dele na página (cabeçalho, nav) — sem isto, o mapa (flex-1) só
    // herdava o que sobrava depois das barras, e nem sempre sobrava muito.
    <div className="relative flex min-h-[70dvh] flex-1 flex-col sm:min-h-[600px]">
      {aCarregar ? (
        <div className="esqueleto flex items-center gap-2 border-b border-stone-200 bg-white px-4 py-2 dark:border-stone-800 dark:bg-stone-950">
          <span className="h-2 w-2 rounded-full bg-stone-200 dark:bg-stone-800" />
          <span className="h-3 w-40 rounded bg-stone-200 dark:bg-stone-800" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              erroEstado && !estado ? "bg-stone-400" : !estado?.ativos ? "bg-green-600" : "bg-amber-500"
            }`}
            aria-hidden
          />
          <span className="font-medium text-stone-900 dark:text-stone-50">
            {erroEstado && !estado
              ? "Não consegui calcular o estado"
              : !estado?.ativos
                ? "Tudo normal em Portugal"
                : `${estado.ativos} ${estado.ativos === 1 ? "falha ativa" : "falhas ativas"}`}
            {!!estado?.programadosHoje &&
              ` · ${estado.programadosHoje} ${estado.programadosHoje === 1 ? "programado hoje" : "programados hoje"}`}
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            ·{" "}
            {erroEstado || !estado?.ultimaAtualizacaoOficial
              ? "dados da E-Redes por sincronizar"
              : `dados da E-Redes atualizados ${tempoRelativo(estado.ultimaAtualizacaoOficial)}`}
          </span>
        </div>
      )}

      {concelhosProgramados.length > 0 && (
        <div className="relative z-[1000] flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 border-b border-stone-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800 sm:py-2 dark:border-stone-800 dark:bg-amber-950 dark:text-amber-200">
          <Clock size={14} className="shrink-0" aria-hidden />
          <span className="line-clamp-1 sm:line-clamp-none">
            Cortes programados pela E-Redes nos próximos dias em{" "}
            {concelhosProgramados.slice(0, 6).join(", ")}
            {concelhosProgramados.length > 6 && ` e mais ${concelhosProgramados.length - 6}`}.
          </span>
          <Link href="/cortes" className="shrink-0 font-semibold underline underline-offset-2">
            Ver detalhes
          </Link>
        </div>
      )}

      <div className="relative z-[1000] flex flex-wrap items-center justify-between gap-1.5 border-b border-stone-200 bg-white px-4 py-2 sm:gap-3 sm:py-3 dark:border-stone-800 dark:bg-stone-950">
        <FiltroServico
          valor={filtro}
          onChange={(v) => {
            setFiltro(v);
            registarFiltroUsado(v);
          }}
        />
        <button
          type="button"
          onClick={reportarAqui}
          disabled={aLocalizar}
          className="min-h-11 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-2 text-xs font-semibold text-stone-900 transition-colors disabled:opacity-60 sm:gap-1.5 sm:px-4 sm:text-sm"
        >
          {aLocalizar ? (
            "A localizar…"
          ) : (
            <>
              <MapPin size={16} aria-hidden /> Falta aqui agora
            </>
          )}
        </button>
      </div>

      {/*
        Pesquisa e legenda, no telemóvel, ficam escondidas atrás de dois
        botões compactos numa única linha (em vez de uma linha inteira cada
        uma) — eram, juntas, a maior causa do mapa ficar espremido numa
        fatia pequena do ecrã. A partir de sm: (onde sobra altura) ambas
        ficam sempre visíveis e os botões nem se mostram.
      */}
      <div className="flex border-b border-stone-200 bg-white text-xs font-medium text-stone-500 sm:hidden dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400">
        <button
          type="button"
          onClick={() => setPesquisaAberta((a) => !a)}
          className="flex min-h-9 flex-1 items-center justify-center gap-1 border-r border-stone-200 py-1.5 dark:border-stone-800"
          aria-expanded={pesquisaAberta}
        >
          <Search size={13} aria-hidden /> Pesquisar
          <ChevronDown size={13} className={`shrink-0 transition-transform ${pesquisaAberta ? "rotate-180" : ""}`} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setLegendaAberta((a) => !a)}
          className="flex min-h-9 flex-1 items-center justify-center gap-1 py-1.5"
          aria-expanded={legendaAberta}
        >
          Legenda
          <ChevronDown size={13} className={`shrink-0 transition-transform ${legendaAberta ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>

      <div
        className={`${pesquisaAberta ? "flex" : "hidden"} relative z-[1200] flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-4 py-2 sm:flex sm:py-3 dark:border-stone-800 dark:bg-stone-950`}
      >
        <BuscaLocal onSelecionar={selecionarBusca} />
        <button
          type="button"
          onClick={() => setResetContagem((c) => c + 1)}
          className="min-h-11 flex items-center gap-1.5 rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-200"
        >
          <MapIcon size={16} aria-hidden /> Portugal todo
        </button>
      </div>

      <div
        className={`${legendaAberta ? "flex" : "hidden"} flex-wrap items-center gap-x-4 gap-y-1 border-b border-stone-200 bg-white px-4 py-1.5 text-xs text-stone-500 sm:flex dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400`}
      >
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-stone-400" aria-hidden /> Oficial E-REDES
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-stone-400" aria-hidden /> Comunidade
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-stone-400 bg-white dark:bg-stone-950" aria-hidden />
          Por confirmar
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-stone-500 bg-stone-400 opacity-60" aria-hidden />
          Programado (E-REDES)
        </span>
        <span className="flex items-center gap-1">
          <Zap size={12} className="text-amber-500" aria-hidden /> Luz
        </span>
        <span className="flex items-center gap-1">
          <Droplet size={12} className="text-sky-500" aria-hidden /> Água
        </span>
      </div>

      {!pontoPendente && (
        <div className="relative z-[1000] flex items-center justify-center gap-1.5 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800 sm:py-2 sm:text-sm dark:bg-amber-950 dark:text-amber-200">
          <MousePointerClick size={15} className="shrink-0" aria-hidden />
          <span className="sm:hidden">Clica no mapa no sítio exato onde falta o serviço.</span>
          <span className="hidden sm:inline">
            Clica no mapa no sítio exato onde falta o serviço — ou usa &quot;Falta aqui agora&quot;.
          </span>
        </div>
      )}

      {erro && (
        <div className="relative z-[1000] bg-red-50 px-4 py-2 text-center text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {erro}
        </div>
      )}

      {aviso && (
        <div
          className={`relative z-[1000] flex items-center justify-between gap-3 px-4 py-2 text-sm ${
            aviso.tipo === "offline"
              ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
              : "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
          }`}
        >
          <span className="flex items-center gap-1.5">
            {aviso.tipo === "offline" ? (
              <WifiOff size={16} className="shrink-0" aria-hidden />
            ) : (
              <CheckCircle2 size={16} className="shrink-0" aria-hidden />
            )}
            {aviso.texto}
          </span>
          <button type="button" onClick={() => setAviso(null)} className="font-semibold" aria-label="Fechar aviso">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="relative flex-1">
        <MapContainer
          bounds={LIMITES_PORTUGAL}
          maxBounds={LIMITES_MAXIMOS}
          maxBoundsViscosity={0.8}
          minZoom={7}
          className="absolute inset-0 mapa-base-neutro"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <CapturarCliques
            ativo={!pontoPendente}
            onClique={(lat, lng) => {
              setPontoPendente({ lat, lng });
              setFoco({ lat, lng });
              registarInicioReporte("mapa");
            }}
          />
          <CentrarMapa coord={foco} />
          <VerPortugalTodo gatilho={resetContagem} />
          <AjustaTamanho />

          {marcadores.map((alerta) => {
            const porConfirmar = alerta.estadoVisual === "por_confirmar";
            const programado = alerta.estadoVisual === "programado";
            const servico = alerta.tipo_servico === "luz" ? "Falta de luz" : "Falta de água";
            const estadoLabel = porConfirmar
              ? "por confirmar"
              : programado
                ? `programado para ${alerta.data_inicio ? formatarDataHora(alerta.data_inicio) : "breve"}`
                : "ativo";
            return (
            <Marker
              key={alerta.id}
              position={[alerta.latitude, alerta.longitude]}
              icon={criarIconeAlerta(alerta.tipo_servico, alerta.origem, alerta.estadoVisual)}
              eventHandlers={{
                popupopen: () => registarAberturaMarcador(alerta.tipo_servico, alerta.origem, alerta.estadoVisual),
              }}
              // L.DivIcon não é uma <img> — a opção `alt` do Leaflet não produz
              // nenhum atributo acessível num <div> (fica só uma propriedade JS
              // sem efeito). Define-se aria-label diretamente no elemento, via
              // ref, para o leitor de ecrã ter mesmo um nome no marcador
              // focável (role="button" vem do próprio Leaflet).
              ref={(marker) => {
                marker
                  ?.getElement()
                  ?.setAttribute("aria-label", `${servico} em ${alerta.concelho}, ${alerta.freguesia} — ${estadoLabel}`);
              }}
            >
              <Popup>
                <div className="flex flex-col gap-1 text-sm">
                  <strong className="flex items-center gap-1.5">
                    {alerta.tipo_servico === "luz" ? (
                      <Zap size={15} className="text-amber-500" aria-hidden />
                    ) : (
                      <Droplet size={15} className="text-sky-500" aria-hidden />
                    )}
                    {alerta.tipo_servico === "luz" ? "Falta de luz" : "Falta de água"}
                    {porConfirmar && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                        Por confirmar
                      </span>
                    )}
                    {programado && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        <Clock size={10} aria-hidden /> Programado
                      </span>
                    )}
                  </strong>
                  <span>
                    {alerta.concelho}
                    {alerta.freguesia ? ` — ${alerta.freguesia}` : ""}
                  </span>
                  {alerta.descricao && <span className="text-stone-600">{alerta.descricao}</span>}
                  <span className="flex items-center gap-1 text-xs text-stone-500">
                    {alerta.origem === "oficial" ? (
                      <ShieldCheck size={13} className="shrink-0" aria-hidden />
                    ) : (
                      <Users size={13} className="shrink-0" aria-hidden />
                    )}
                    {alerta.origem === "oficial" ? "Oficial E-REDES" : "Comunidade"} ·{" "}
                    {programado && alerta.data_inicio
                      ? `começa ${formatarDataHora(alerta.data_inicio)}`
                      : tempoRelativo(alerta.criado_em)}
                    {alerta.origem === "comunidade" && ` · ${alerta.contador_votos} confirmações`}
                  </span>
                  {alerta.origem === "comunidade" && (
                    <div className="mt-1 flex flex-col gap-1.5">
                      {porConfirmar && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Precisa de mais 1 confirmação independente para contar como falha ativa.
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => confirmar(alerta.id)}
                          className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-stone-900"
                        >
                          Eu também estou sem isto
                        </button>
                        <button
                          type="button"
                          onClick={() => denunciar(alerta.id)}
                          className="text-xs text-stone-500 underline hover:text-stone-600"
                        >
                          Não é verdade
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => partilhar(alerta)}
                    className="mt-1 flex items-center gap-1 self-start text-xs text-stone-500 underline hover:text-stone-700 dark:hover:text-stone-300"
                  >
                    {linkCopiadoId === alerta.id ? (
                      <>
                        <Check size={13} /> Link copiado!
                      </>
                    ) : (
                      <>
                        <Share2 size={13} /> Partilhar
                      </>
                    )}
                  </button>
                </div>
              </Popup>
            </Marker>
            );
          })}
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
          <div className="absolute top-3 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-stone-600 shadow dark:bg-stone-900/90 dark:text-stone-300">
            <Loader2 size={13} className="animate-spin" aria-hidden />
            A carregar alertas…
          </div>
        )}
      </div>
    </div>
  );
}
