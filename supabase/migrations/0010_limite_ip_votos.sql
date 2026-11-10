-- Bug de confiança encontrado em produção (9/11, durante a tempestade): a
-- confirmação/denúncia/"já voltou" (votar_alerta, denunciar_alerta,
-- marcar_resolvido_alerta) é chamada diretamente do browser para o
-- Supabase, nunca passa pela nossa API — por isso só é limitada por
-- client_id (reiniciável à vontade numa janela anónima), nunca por IP. O
-- limite por IP já existente em limitador_ip só cobre a CRIAÇÃO de
-- reportes (/api/alertas), não a confirmação de reportes já existentes —
-- é exatamente aí que um utilizador malicioso pode fazer um "ativo" falso
-- parecer confirmado num concelho real.
--
-- `tipo` separa o orçamento de cada ação: confirmar um alerta não deve
-- gastar o limite de criar reportes novos, nem vice-versa. Default
-- 'reporte' aplica-se automaticamente às linhas já existentes (só esse uso
-- existia até agora) e às inserções futuras de /api/alertas que não
-- indiquem o campo.
alter table public.limitador_ip add column if not exists tipo text not null default 'reporte';

create index if not exists idx_limitador_ip_hash_tipo_criado_em on public.limitador_ip (ip_hash, tipo, criado_em);
