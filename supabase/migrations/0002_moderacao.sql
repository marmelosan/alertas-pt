-- Etapa 5: rate limiting + moderação básica

-- Identificador anónimo por browser (gerado no cliente, guardado em
-- localStorage) — usado só para limitar frequência de reportes, não
-- identifica a pessoa.
alter table public.alertas add column client_id text;
alter table public.alertas add column contador_denuncias integer not null default 0;

create index idx_alertas_client_id_criado_em on public.alertas (client_id, criado_em);

-- Denúncia ("isto não está certo"). Ao fim de 3 denúncias distintas de
-- fontes diferentes seria o ideal, mas para o MVP contamos denúncias
-- simples — suficiente para apanhar spam óbvio sem construir um sistema
-- de contas de utilizador só para isto.
create or replace function public.denunciar_alerta(alerta_id uuid)
returns public.alertas
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado public.alertas;
begin
  update public.alertas
  set
    contador_denuncias = contador_denuncias + 1,
    status = case when contador_denuncias + 1 >= 3 then 'resolvido'::status_alerta else status end
  where id = alerta_id and status = 'ativo' and origem = 'comunidade'
  returning * into resultado;

  return resultado;
end;
$$;

grant execute on function public.denunciar_alerta(uuid) to anon, authenticated;

-- Reportes de comunidade passam a entrar só pela rota /api/alertas no
-- servidor (service_role, que ignora RLS e aplica rate limiting antes de
-- inserir). A policy de insert direto do cliente é removida: sem ela,
-- contornar o rate limit chamando o Supabase diretamente do browser deixa
-- de ser possível.
drop policy if exists "qualquer um pode reportar" on public.alertas;
