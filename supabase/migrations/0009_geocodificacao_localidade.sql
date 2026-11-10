-- Mesmo padrão de geocodificacao_cp (migração 0005), para a mesma razão:
-- a sincronização de fontes de água (Bloco 13) geocodifica por nome de
-- localidade em vez de código postal, e sem cache persistente repetia o
-- pedido à LocationIQ em todas as sincronizações, arriscando o limite de
-- pedidos/minuto do plano grátis.
create table public.geocodificacao_localidade (
  chave text primary key,
  latitude double precision not null,
  longitude double precision not null,
  atualizado_em timestamptz not null default now()
);

alter table public.geocodificacao_localidade enable row level security;
-- Sem policies: só a service_role (usada nos jobs de sincronização) lê e
-- escreve aqui. Não tem dados pessoais — só nome de lugar -> coordenadas,
-- que é informação pública.
