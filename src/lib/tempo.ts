/** Partilhado entre o mapa da home e o mapa por concelho, para o formato ficar igual nos dois. */
export function tempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `há ${horas}h`;
}

/** Bloco 14, Passo 2: duração real de um corte já resolvido ("2h 10min", "35 min"). */
export function formatarDuracao(inicioIso: string, fimIso: string): string {
  const minutosTotais = Math.max(0, Math.round((new Date(fimIso).getTime() - new Date(inicioIso).getTime()) / 60000));
  const horas = Math.floor(minutosTotais / 60);
  const minutos = minutosTotais % 60;
  if (horas === 0) return `${minutos} min`;
  if (minutos === 0) return `${horas}h`;
  return `${horas}h ${minutos}min`;
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
