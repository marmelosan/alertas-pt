-- Bloco 6 do briefing: proteção contra abuso + retenção de dados real.

-- Limite por IP, além do já existente por client_id. Nunca guardamos o IP
-- em bruto — só o hash (SHA-256), que não é reversível, numa tabela à
-- parte sem policy de leitura pública (a tabela `alertas` tem
-- "leitura publica" — guardar o IP lá seria expor morada aproximada +
-- IP de quem reportou a qualquer pessoa que leia a API pública).
create table public.limitador_ip (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  criado_em timestamptz not null default now()
);

create index idx_limitador_ip_hash_criado_em on public.limitador_ip (ip_hash, criado_em);

alter table public.limitador_ip enable row level security;
-- Sem policies: só a service_role (usada em /api/alertas, do lado do
-- servidor) consegue ler/escrever aqui. anon/authenticated não têm acesso
-- nenhum, nem sequer para inserir.

-- Limpa pedidos de IP com mais de 1 dia — só serve para a janela de rate
-- limit (10 min), não há razão nenhuma para guardar isto mais tempo.
create or replace function public.limpar_limitador_ip_antigo()
returns void language sql as $$
  delete from public.limitador_ip where criado_em < now() - interval '1 day';
$$;

select cron.schedule(
  'limpar-limitador-ip',
  '0 * * * *',
  $$ select public.limpar_limitador_ip_antigo(); $$
);

-- Retenção: reportes da comunidade resolvidos (depois das 24h ativos) ficam
-- como histórico visível nas páginas de concelho durante 90 dias, e são
-- apagados definitivamente a seguir. Não há dados pessoais nestas linhas
-- (sem conta, sem email, localização já arredondada a ~100m antes de
-- entrar na BD), mas também não há razão para as guardar para sempre.
create or replace function public.apagar_alertas_antigos()
returns void language sql as $$
  delete from public.alertas
  where origem = 'comunidade'
    and status = 'resolvido'
    and atualizado_em < now() - interval '90 days';
$$;

select cron.schedule(
  'apagar-alertas-antigos',
  '30 3 * * *',
  $$ select public.apagar_alertas_antigos(); $$
);
