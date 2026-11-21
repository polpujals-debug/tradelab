-- TradeLab · arregla la taula "settings" si ja n'existia una altra amb una estructura diferent.
-- NO esborra res: la taula antiga es reanomena a "settings_antiga". Es pot executar més d'una vegada.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'settings')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'settings' and column_name = 'default_risk_pct') then
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'settings_antiga') then
      execute 'alter table public.settings rename to settings_antiga_' || to_char(now(), 'YYYYMMDDHH24MISS');
    else
      alter table public.settings rename to settings_antiga;
    end if;
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

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at before update on public.settings for each row execute function set_updated_at();

alter table public.settings enable row level security;
revoke all on public.settings from anon, authenticated;
grant all on public.settings to service_role;

-- Configuració inicial (compte per defecte si n'hi ha)
insert into public.settings (id, default_account_id, currency, default_risk_pct, risk_warning_pct, max_daily_loss, max_weekly_loss, max_trades_per_day)
select 1, (select id from public.accounts where is_default limit 1), 'EUR', 3, 2, 9, 20, 4
on conflict (id) do nothing;

notify pgrst, 'reload schema';
