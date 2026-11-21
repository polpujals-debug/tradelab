-- TradeLab · permisos per a la clau de servidor. Es pot executar tantes vegades com calgui.

-- Permisos explícits per a la clau de servidor (service_role).
-- Alguns projectes nous de Supabase no els donen automàticament a les taules creades per SQL.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
