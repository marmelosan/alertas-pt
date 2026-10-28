-- Etapa 1: schema de dados para alertas de água e luz
-- Extensões necessárias (Supabase já traz pgcrypto; pg_cron requer ativação no dashboard)
create extension if not exists "pgcrypto";
create extension if not exists pg_cron;

create type tipo_servico as enum ('agua', 'luz');
create type status_alerta as enum ('ativo', 'resolvido');
create type origem_alerta as enum ('comunidade', 'oficial');

create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  tipo_servico tipo_servico not null,
  concelho text not null,
  freguesia text,
  latitude double precision not null,
  longitude double precision not null,
  descricao text,
  contador_votos integer not null default 1,
  status status_alerta not null default 'ativo',
  origem origem_alerta not null default 'comunidade',
  -- id do registo na fonte oficial (ex.: E-Redes), usado para upsert idempotente
  -- na sincronização automática. Nulo para alertas reportados pela comunidade.
  external_id text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint alertas_lat_check check (latitude between -90 and 90),
  constraint alertas_lng_check check (longitude between -180 and 180)
);

create unique index idx_alertas_external_id on public.alertas (external_id)
  where external_id is not null;

create index idx_alertas_concelho on public.alertas (concelho) where status = 'ativo';
create index idx_alertas_tipo on public.alertas (tipo_servico) where status = 'ativo';
create index idx_alertas_criado_em on public.alertas (criado_em);

-- mantém atualizado_em em dia sempre que a linha muda
create or replace function public.touch_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger trg_alertas_touch
before update on public.alertas
for each row execute function public.touch_atualizado_em();

-- Voto/confirmação ("eu também estou sem isto") — única forma de alterar
-- contador_votos a partir do cliente. Evita UPDATE direto e arbitrário.
create or replace function public.votar_alerta(alerta_id uuid)
returns public.alertas
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado public.alertas;
begin
  update public.alertas
  set contador_votos = contador_votos + 1
  where id = alerta_id and status = 'ativo'
  returning * into resultado;

  return resultado;
end;
$$;

-- Expira automaticamente alertas de COMUNIDADE sem novas confirmações há 4h.
-- Alertas de origem OFICIAL (ex.: E-Redes) não são tocados aqui: o estado deles
-- é definido pelo job de sincronização (Etapa 2), que reflete o que a fonte
-- oficial diz agora, não um temporizador às cegas.
create or replace function public.expirar_alertas_antigos()
returns void language sql as $$
  update public.alertas
  set status = 'resolvido'
  where status = 'ativo'
    and origem = 'comunidade'
    and atualizado_em < now() - interval '4 hours';
$$;

select cron.schedule(
  'expirar-alertas-antigos',
  '*/15 * * * *',
  $$ select public.expirar_alertas_antigos(); $$
);

-- RLS
alter table public.alertas enable row level security;

create policy "leitura publica" on public.alertas
  for select using (true);

create policy "qualquer um pode reportar" on public.alertas
  for insert with check (
    origem = 'comunidade'
    and tipo_servico in ('agua', 'luz')
  );

-- Sem policy de UPDATE/DELETE para anon/authenticated: votos passam só pela
-- função votar_alerta() (security definer); a sincronização oficial corre
-- com a service_role key a partir do servidor (Etapa 2), que ignora RLS.
revoke update, delete on public.alertas from anon, authenticated;
grant execute on function public.votar_alerta(uuid) to anon, authenticated;
