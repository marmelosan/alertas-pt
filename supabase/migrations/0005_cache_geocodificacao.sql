-- A sincronização da E-Redes geocodificava, do zero, TODOS os códigos
-- postais em cada corrida — a "cache" só vivia na memória da função
-- durante essa chamada, perdia-se logo a seguir. Com dezenas de códigos
-- postais diferentes e o limite de pedidos/minuto do LocationIQ, isto
-- estava a fazer a sincronização falhar por timeout ou por "Rate
-- Limited Minute". Um código postal nunca muda de concelho/freguesia,
-- por isso não há razão nenhuma para o voltar a pedir à LocationIQ
-- depois de já sabermos a resposta.
create table public.geocodificacao_cp (
  codigo_postal text primary key,
  latitude double precision not null,
  longitude double precision not null,
  concelho text not null,
  freguesia text,
  atualizado_em timestamptz not null default now()
);

alter table public.geocodificacao_cp enable row level security;
-- Sem policies: só a service_role (usada no job de sincronização) lê e
-- escreve aqui. Não tem dados pessoais — só a relação código postal →
-- coordenadas/concelho, que é informação pública.
