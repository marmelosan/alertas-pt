-- Bloco 14, Passo 2: "Já voltou?" + duração real do corte.
--
-- Mesma barreira de 2 confirmações independentes já usada para passar a
-- "ativo" (Bloco 6, votar_alerta) — um único clique (malicioso ou
-- enganado) não chega para fechar um alerta real, mas também não
-- precisamos de inventar outro limiar. Só para reportes da comunidade:
-- cortes oficiais já têm data_fim vinda da E-Redes, não precisam de voto
-- nenhum para se saber quando acabaram.
alter table public.alertas add column contador_resolvido_votos integer not null default 0;
alter table public.alertas add column resolvido_em timestamptz;

comment on column public.alertas.resolvido_em is
  'Quando o alerta passou a resolvido de verdade (voto "já voltou" ou sincronização oficial) — usado para calcular a duração real (criado_em → resolvido_em). Nulo enquanto ativo.';

create or replace function public.marcar_resolvido_alerta(alerta_id uuid)
returns public.alertas
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado public.alertas;
  novo_contador integer;
begin
  update public.alertas
  set contador_resolvido_votos = contador_resolvido_votos + 1
  where id = alerta_id and status = 'ativo' and origem = 'comunidade'
  returning contador_resolvido_votos into novo_contador;

  -- Linha não encontrada ou já não está ativa/não é da comunidade: devolve
  -- o estado atual sem mexer em mais nada, em vez de um erro.
  if novo_contador is null then
    select * into resultado from public.alertas where id = alerta_id;
    return resultado;
  end if;

  if novo_contador >= 2 then
    update public.alertas
    set status = 'resolvido', resolvido_em = now()
    where id = alerta_id
    returning * into resultado;
  else
    select * into resultado from public.alertas where id = alerta_id;
  end if;

  return resultado;
end;
$$;

grant execute on function public.marcar_resolvido_alerta(uuid) to anon, authenticated;

-- Bloco 14, Passo 3: histórico de alterações visíveis (ex.: "horário
-- alterado de 9h–13h para 9h–14h"). Começa só com cortes oficiais — são os
-- únicos com datas estruturadas que a sincronização consegue comparar
-- automaticamente contra a versão anterior (ver eredes-sync.ts).
create table public.alertas_historico (
  id bigint generated always as identity primary key,
  alerta_id uuid not null references public.alertas(id) on delete cascade,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  criado_em timestamptz not null default now()
);

create index idx_alertas_historico_alerta_id on public.alertas_historico (alerta_id, criado_em);

alter table public.alertas_historico enable row level security;

create policy "leitura publica" on public.alertas_historico
  for select using (true);

-- Sem policy de insert/update/delete para anon/authenticated — só a
-- service_role (usada em eredes-sync.ts, do lado do servidor) escreve aqui.
