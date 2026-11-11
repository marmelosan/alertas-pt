import Link from "next/link";
import {
  listarCartoesConcelhos,
  listarConcelhosComCortesProgramados,
  obterUltimaAtualizacaoOficial,
} from "@/lib/alertas-server";
import { paraSlug } from "@/lib/slug";
import { tempoRelativo } from "@/lib/tempo";

const TOPO_CONCELHOS = 5;

/**
 * Resumo em texto puro, gerado no servidor — o mapa (`MapaAlertasClient`) e
 * o painel de reportes recentes são `"use client"` e não existem no HTML
 * inicial, por isso quem chega sem JavaScript (incluindo o crawler do
 * Google) via homepage vazia. Isto garante que há sempre conteúdo real
 * logo no primeiro pedido: quantas falhas ativas, quais concelhos, há
 * quanto tempo os dados oficiais foram atualizados.
 */
export async function ResumoServidor() {
  // A home nunca dependia de nenhum pedido ao Supabase no servidor (o mapa
  // e os reportes recentes são "use client", com fetch próprio) — isto é o
  // primeiro. Uma falha aqui não pode derrubar a home inteira, por isso
  // falha em silêncio (sem secção) em vez de deixar a exceção propagar.
  let cartoes, concelhosProgramados, ultimaAtualizacao;
  try {
    [cartoes, concelhosProgramados, ultimaAtualizacao] = await Promise.all([
      listarCartoesConcelhos(),
      listarConcelhosComCortesProgramados(),
      obterUltimaAtualizacaoOficial(),
    ]);
  } catch (erro) {
    console.error("[ResumoServidor] não consegui montar o resumo da home:", erro);
    return null;
  }

  const totalFalhas = cartoes.reduce((soma, c) => soma + c.total, 0);
  const topConcelhos = [...cartoes].sort((a, b) => b.total - a.total).slice(0, TOPO_CONCELHOS);

  return (
    <section className="border-b border-stone-200 px-4 py-2 text-xs text-stone-600 dark:border-stone-800 dark:text-stone-400">
      <p>
        {totalFalhas > 0
          ? `${totalFalhas} ${totalFalhas === 1 ? "falha ativa" : "falhas ativas"} reportadas em ${cartoes.length} ${cartoes.length === 1 ? "concelho" : "concelhos"} agora.`
          : "Sem falhas ativas reportadas neste momento."}
        {concelhosProgramados.length > 0 &&
          ` ${concelhosProgramados.length} ${concelhosProgramados.length === 1 ? "concelho tem" : "concelhos têm"} cortes de luz programados pela E-Redes.`}
        {ultimaAtualizacao && ` Dados oficiais atualizados ${tempoRelativo(ultimaAtualizacao)}.`}
      </p>
      {topConcelhos.length > 0 && (
        <p className="mt-1">
          Mais afetados agora:{" "}
          {topConcelhos.map((c, i) => (
            <span key={c.concelho}>
              <Link href={`/cortes/${paraSlug(c.concelho)}`} className="underline underline-offset-2">
                {c.concelho}
              </Link>
              {` (${c.total})`}
              {i < topConcelhos.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
