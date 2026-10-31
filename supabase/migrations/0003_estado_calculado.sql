-- Bloco 1 do briefing: corrige a inconsistência entre páginas sobre o que
-- conta como "ativo". Duas causas raiz:
--
-- 1. Cortes oficiais da E-Redes só tinham a data de início/fim guardada
--    em texto livre (dentro de `descricao`), nunca como campos estruturados
--    — por isso não havia como saber, sem fazer parsing de texto, se um
--    corte "programado" para o futuro já começou ou não. Fica sempre
--    status='ativo' desde que entra na sincronização, venha hoje ou daqui
--    a uma semana.
-- 2. Reportes da comunidade só expiravam ao fim de 4h sem confirmações
--    novas (ver 0001_init.sql). O briefing pede uma janela fixa de 24h
--    desde a criação, independente de confirmações.
--
-- A correção "de fundo" (ler `data_inicio`/`data_fim` e decidir ativo vs.
-- programado vs. expirado no momento da leitura, com `calcularEstado()` em
-- src/lib/estado-alerta.ts) fica do lado da aplicação — SQL não é o sítio
-- certo para essa lógica, que também tem de correr no browser em tempo
-- real sem round-trip à base de dados. Esta migração só prepara o terreno:
-- as colunas que faltavam, e a janela de expiração correta.

alter table public.alertas add column data_inicio timestamptz;
alter table public.alertas add column data_fim timestamptz;

comment on column public.alertas.data_inicio is
  'Só para origem=oficial: início do corte programado, vindo da E-Redes. Nulo para reportes da comunidade.';
comment on column public.alertas.data_fim is
  'Só para origem=oficial: fim previsto do corte programado, vindo da E-Redes. Nulo para reportes da comunidade.';

create or replace function public.expirar_alertas_antigos()
returns void language sql as $$
  update public.alertas
  set status = 'resolvido'
  where status = 'ativo'
    and origem = 'comunidade'
    and criado_em < now() - interval '24 hours';
$$;
