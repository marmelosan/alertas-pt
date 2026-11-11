-- Bloco 15 — guarda o código postal de origem de cada alerta oficial
-- (quando disponível). A E-Redes não expõe nome de rua no dataset de
-- cortes programados, só zipcode/municipality/parish; o código postal de
-- 7 dígitos é o identificador mais granular que já temos, e estava a ser
-- descartado depois de servir só para geocodificar. Guardá-lo permite
-- mostrar algo mais útil do que "2 ruas/zonas afetadas" sem nomear nada.
alter table public.alertas add column if not exists codigo_postal text;
