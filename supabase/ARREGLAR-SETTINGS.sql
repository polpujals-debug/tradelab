-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ TradeLab · ARREGLAR-SETTINGS                                       ║
-- ║ Aparta qualsevol objecte "settings" que no sigui de TradeLab       ║
-- ║ (taula, vista…), sense esborrar-lo, i crea la taula correcta.      ║
-- ║ Al final mostra el resultat. Es pot executar més d'una vegada.     ║
-- ╚══════════════════════════════════════════════════════════════════╝
do $$
declare
  k "char";
  nou text := 'settings_antiga_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
begin
  select c.relkind into k from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'settings';
  if k is not null and not exists (
      select 1 from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'settings' and a.attname = 'default_risk_pct' and not a.attisdropped)
     or (k is not null and not exists (
      select 1 from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'settings' and a.attname = 'id' and not a.attisdropped)) then
    if k = 'v' then execute format('alter view public.settings rename to %I', nou);
    elsif k = 'm' then execute format('alter materialized view public.settings rename to %I', nou);
    elsif k = 'f' then execute format('alter foreign table public.settings rename to %I', nou);
    else execute format('alter table public.settings rename to %I', nou);
    end if;
    raise notice 'settings antiga apartada com a %', nou;
  end if;
end $$;

create table if not exists public.settings (
  id smallint primary key default 1 check (id = 1),
  default_account_id uuid references public.accounts(id),
  currency text not null default 'EUR',
  default_risk_pct numeric(5,2) not null default 1 check (default_risk_pct > 0 and default_risk_pct <= 100),
  risk_warning_pct numeric(5,2) not null default 2,
  max_daily_loss numeric(14,2),
  max_weekly_loss numeric(14,2),
  max_trades_per_day integer,
  timezone text not null default 'Europe/Madrid',
  locale text not null default 'ca',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at() returns trigger language plpgsql as $f$
begin
  new.updated_at := now();
  return new;
end $f$;

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at before update on public.settings for each row execute function set_updated_at();
alter table public.settings enable row level security;
revoke all on public.settings from anon, authenticated;
grant all on public.settings to service_role;

insert into public.settings (id, default_account_id, currency, default_risk_pct, risk_warning_pct, max_daily_loss, max_weekly_loss, max_trades_per_day)
select 1, (select id from public.accounts where is_default limit 1), 'EUR', 2, 2, 9, 20, 4
on conflict (id) do nothing;

notify pgrst, 'reload schema';

-- Resultat: ha de sortir una fila amb resultat = 'CORRECTE'
select case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='settings' and column_name='id')
            then 'CORRECTE' else 'ENCARA MALAMENT' end as resultat,
       (select count(*) from public.settings) as files_settings,
       (select string_agg(column_name, ', ' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='settings') as columnes;
