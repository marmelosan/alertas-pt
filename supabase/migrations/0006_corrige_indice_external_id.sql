-- O índice único "parcial" (só para external_id não nulo) impedia o
-- upsert(..., { onConflict: "external_id" }) de funcionar: o Postgres
-- exige que o ON CONFLICT bata certo exatamente com a definição do
-- índice, incluindo a condição WHERE, e o upsert do Supabase não a
-- inclui. Isto fazia o upsert falhar sempre, silenciosamente — por
-- isso a sincronização da E-Redes nunca gravava nenhum alerta, mesmo
-- já com a geocodificação em cache.
--
-- Não é preciso a condição WHERE: uma constraint única normal em
-- Postgres já trata cada NULL como distinto dos outros, por isso já
-- permite à vontade vários reportes da comunidade sem external_id.
drop index if exists public.idx_alertas_external_id;

alter table public.alertas
  add constraint alertas_external_id_key unique (external_id);
