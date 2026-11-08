-- Bug encontrado em produção (8/11): votar_alerta, denunciar_alerta e
-- marcar_resolvido_alerta só recebiam o id do alerta, sem verificar quem
-- estava a chamar. Qualquer um com a consola do browser aberta podia:
-- auto-confirmar o próprio reporte, matar um reporte real com 3 chamadas
-- seguidas a denunciar_alerta, ou fechar sozinho um corte ativo com duas
-- chamadas a marcar_resolvido_alerta. A regra das "2 confirmações
-- independentes" nunca foi imposta a sério — só mostrada no texto.
--
-- Mesmo client_id (localStorage, já usado para o rate limit de reportes em
-- client-id.ts) usado agora para impedir a MESMA origem de contar duas
-- vezes na MESMA interação sobre o MESMO alerta. Não é à prova de um
-- utilizador deliberado a limpar o localStorage, mas sobe a fasquia de
-- "zero esforço" para "esforço deliberado" — o mesmo nível de proteção já
-- aceite no resto do projeto (ver limitador_ip).
create table public.interacoes_alerta (
  id bigint generated always as identity primary key,
  alerta_id uuid not null references public.alertas(id) on delete cascade,
  tipo text not null check (tipo in ('voto', 'denuncia', 'resolvido')),
  client_id text not null,
  criado_em timestamptz not null default now(),
  unique (alerta_id, tipo, client_id)
);

create index idx_interacoes_alerta_alerta_tipo on public.interacoes_alerta (alerta_id, tipo);

alter table public.interacoes_alerta enable row level security;
-- Sem nenhuma policy para anon/authenticated: ninguém lê nem escreve aqui
-- diretamente — só as funções security definer abaixo, que correm com os
-- privilégios de quem definiu a função, não do chamador.

-- Assinaturas antigas (um só argumento) têm de ser removidas explicitamente:
-- "create or replace" com uma lista de parâmetros diferente cria uma
-- segunda função em vez de substituir a primeira, o que deixava a versão
-- insegura continuar chamável.
drop function if exists public.votar_alerta(uuid);
drop function if exists public.denunciar_alerta(uuid);
drop function if exists public.marcar_resolvido_alerta(uuid);

create or replace function public.votar_alerta(alerta_id uuid, p_client_id text)
returns public.alertas
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado public.alertas;
begin
  begin
    insert into public.interacoes_alerta (alerta_id, tipo, client_id)
    values (alerta_id, 'voto', p_client_id);
  exception when unique_violation then
    -- já votou antes com este client_id: devolve o estado atual, sem repetir a contagem
    select * into resultado from public.alertas where id = alerta_id;
    return resultado;
  end;

  update public.alertas
  set contador_votos = contador_votos + 1
  where id = alerta_id and status = 'ativo'
  returning * into resultado;

  return resultado;
end;
$$;

grant execute on function public.votar_alerta(uuid, text) to anon, authenticated;

create or replace function public.denunciar_alerta(alerta_id uuid, p_client_id text)
returns public.alertas
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado public.alertas;
begin
  begin
    insert into public.interacoes_alerta (alerta_id, tipo, client_id)
    values (alerta_id, 'denuncia', p_client_id);
  exception when unique_violation then
    select * into resultado from public.alertas where id = alerta_id;
    return resultado;
  end;

  update public.alertas
  set
    contador_denuncias = contador_denuncias + 1,
    status = case when contador_denuncias + 1 >= 3 then 'resolvido'::status_alerta else status end
  where id = alerta_id and status = 'ativo' and origem = 'comunidade'
  returning * into resultado;

  return resultado;
end;
$$;

grant execute on function public.denunciar_alerta(uuid, text) to anon, authenticated;

create or replace function public.marcar_resolvido_alerta(alerta_id uuid, p_client_id text)
returns public.alertas
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado public.alertas;
  novo_contador integer;
begin
  begin
    insert into public.interacoes_alerta (alerta_id, tipo, client_id)
    values (alerta_id, 'resolvido', p_client_id);
  exception when unique_violation then
    select * into resultado from public.alertas where id = alerta_id;
    return resultado;
  end;

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

grant execute on function public.marcar_resolvido_alerta(uuid, text) to anon, authenticated;
