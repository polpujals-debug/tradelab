-- TradeLab · estructura completa de la base de dades (taules, vistes, seguretat i bucket de captures).
-- Enganxa-ho tot al SQL Editor de Supabase i prem Run. Només s'ha d'executar UNA vegada.

-- ===== 20261121000001_schema.sql =====
-- TradeLab · esquema inicial
-- Plataforma d'un sol usuari, sense login: tot l'accés a la BD es fa des del
-- servidor amb la service role key. RLS està activat a totes les taules SENSE
-- polítiques per als rols anon/authenticated, de manera que la clau pública no
-- pot llegir ni escriure res.

create extension if not exists pgcrypto;

-- ───────────────────────── Tipus ─────────────────────────
create type account_type as enum ('paper', 'real');
create type trade_direction as enum ('long', 'short');
create type trade_status as enum ('planned', 'open', 'closed', 'cancelled');
create type market_bias as enum ('bullish', 'bearish', 'neutral');
create type analysis_outcome as enum ('pending', 'fulfilled', 'partial', 'failed');
create type content_source as enum ('claude', 'manual', 'scheduled');
create type media_kind as enum ('before', 'during', 'after', 'analysis', 'report', 'example');
create type media_entity as enum ('trade', 'analysis', 'market_report', 'concept');
create type tag_kind as enum ('error', 'emotion', 'setup');
create type report_type as enum ('daily', 'weekly', 'adhoc');
create type concept_status as enum ('pending', 'learning', 'mastered');
create type goal_kind as enum ('journal_streak', 'winning_trades', 'trades_count', 'net_pnl', 'win_rate', 'custom');

-- ───────────────────────── Utilitats ─────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ───────────────────────── Taules ─────────────────────────
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type account_type not null default 'paper',
  initial_capital numeric(14,2) not null check (initial_capital >= 0),
  currency text not null default 'EUR',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index accounts_one_default on accounts (is_default) where is_default;

create table assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique check (symbol = upper(symbol)),
  type text not null default 'crypto',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table strategies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null check (version > 0),
  description_md text not null default '',
  timeframes jsonb not null default '{"bias":"1H","confirmation":"5m","execution":"1m"}',
  indicators text[] not null default '{MA50}',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, version)
);
create unique index strategies_one_active on strategies (is_active) where is_active;

create table strategy_rules (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references strategies(id) on delete cascade,
  text text not null,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index strategy_rules_strategy on strategy_rules (strategy_id, sort_order);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  title text not null,
  timeframes text[] not null default '{}',
  bias market_bias not null default 'neutral',
  levels jsonb not null default '{"supports":[],"resistances":[],"ma50":null}',
  content_md text not null default '',
  scenario text,
  outcome analysis_outcome not null default 'pending',
  review_at date,
  reviewed_at timestamptz,
  my_notes text,
  questions text,
  source content_source not null default 'manual',
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index analyses_asset_date on analyses (asset_id, analyzed_at desc);

create table trades (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  asset_id uuid not null references assets(id),
  strategy_id uuid references strategies(id),
  analysis_id uuid references analyses(id) on delete set null,
  direction trade_direction not null,
  status trade_status not null default 'planned',
  entry_at timestamptz,
  exit_at timestamptz,
  entry_price numeric(20,8) not null check (entry_price > 0),
  stop_loss numeric(20,8) not null check (stop_loss > 0),
  take_profit numeric(20,8) check (take_profit > 0),
  exit_price numeric(20,8) check (exit_price > 0),
  quantity numeric(24,10) not null check (quantity > 0),
  leverage numeric(8,2) not null default 1 check (leverage >= 1),
  fees numeric(14,4) not null default 0 check (fees >= 0),
  capital_at_entry numeric(14,2) not null check (capital_at_entry > 0),
  bias_1h market_bias,
  confirmation_5m text,
  trigger_1m text,
  setup text,
  emotion_before text,
  emotion_after text,
  notes text,
  lesson text,
  source content_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sl_side check (
    (direction = 'long' and stop_loss < entry_price) or
    (direction = 'short' and stop_loss > entry_price)
  ),
  constraint closed_has_exit check (
    status <> 'closed' or (exit_price is not null and exit_at is not null)
  )
);
create index trades_status_exit on trades (status, exit_at desc);
create index trades_asset on trades (asset_id);

create table trade_rule_checks (
  trade_id uuid not null references trades(id) on delete cascade,
  rule_id uuid not null references strategy_rules(id) on delete cascade,
  passed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trade_id, rule_id)
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind tag_kind not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, name)
);

create table trade_tags (
  trade_id uuid not null references trades(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trade_id, tag_id)
);

create table market_reports (
  id uuid primary key default gen_random_uuid(),
  type report_type not null,
  title text not null,
  summary text,
  content_md text not null,
  report_date date not null,
  btc_bias market_bias,
  eth_bias market_bias,
  watchlist text[] not null default '{}',
  is_read boolean not null default false,
  source content_source not null default 'scheduled',
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index market_reports_date on market_reports (report_date desc, created_at desc);

create table concepts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  summary text,
  content_md text not null default '',
  status concept_status not null default 'pending',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Exemples reals d'un concepte: reutilitzen anàlisis o operacions existents
create table concept_examples (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts(id) on delete cascade,
  analysis_id uuid references analyses(id) on delete cascade,
  trade_id uuid references trades(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (analysis_id is not null or trade_id is not null)
);

create table media (
  id uuid primary key default gen_random_uuid(),
  entity_type media_entity,
  entity_id uuid,
  kind media_kind not null default 'analysis',
  url text not null,
  thumb_url text,
  storage_path text,
  mime_type text,
  width integer,
  height integer,
  size_bytes integer,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index media_entity on media (entity_type, entity_id, sort_order);

create table goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind goal_kind not null default 'custom',
  target numeric(14,2) not null check (target > 0),
  manual_progress numeric(14,2) not null default 0,
  starts_on date not null default current_date,
  deadline date,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table practice_attempts (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references analyses(id) on delete cascade,
  trade_id uuid references trades(id) on delete cascade,
  answer_bias market_bias,
  answer_stop numeric(20,8),
  bias_correct boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table settings (
  id smallint primary key default 1 check (id = 1),
  default_account_id uuid references accounts(id),
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

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table idempotency_keys (
  key text not null,
  scope text not null,
  request_hash text not null,
  status_code integer not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (scope, key)
);

-- ───────────────────────── Triggers updated_at ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'accounts','assets','strategies','strategy_rules','analyses','trades',
    'trade_rule_checks','tags','market_reports','concepts','concept_examples',
    'media','goals','practice_attempts','settings','api_keys'
  ] loop
    execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ───────────────────────── RLS ─────────────────────────
-- Activat sense polítiques: només la service role (servidor) hi té accés.
do $$
declare t text;
begin
  foreach t in array array[
    'accounts','assets','strategies','strategy_rules','analyses','trades',
    'trade_rule_checks','tags','trade_tags','market_reports','concepts',
    'concept_examples','media','goals','practice_attempts','settings',
    'api_keys','idempotency_keys'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;

-- ===== 20261121000002_views.sql =====
-- TradeLab · vistes de càlcul
-- Font única de veritat per a les mètriques per operació. Les mateixes
-- fórmules estan replicades (i testejades) a lib/finance per a la calculadora
-- i per a les operacions encara no desades.

-- Mètriques per operació
create or replace view v_trade_metrics
with (security_invoker = true) as
with base as (
  select
    t.*,
    a.symbol,
    case when t.direction = 'long' then 1 else -1 end as dir_sign,
    abs(t.entry_price - t.stop_loss) as risk_per_unit
  from trades t
  join assets a on a.id = t.asset_id
),
checks as (
  select c.trade_id,
         count(*) filter (where c.passed) as rules_passed
  from trade_rule_checks c
  group by c.trade_id
),
rules as (
  select strategy_id, count(*) as rules_total
  from strategy_rules
  group by strategy_id
)
select
  b.id, b.account_id, b.asset_id, b.symbol, b.strategy_id, b.analysis_id,
  b.direction, b.status, b.entry_at, b.exit_at,
  b.entry_price, b.stop_loss, b.take_profit, b.exit_price,
  b.quantity, b.leverage, b.fees, b.capital_at_entry,
  b.bias_1h, b.setup, b.source, b.created_at,
  round(b.entry_price * b.quantity, 2)                              as position_value,
  round(b.risk_per_unit * b.quantity, 4)                            as risk_amount,
  round(b.risk_per_unit * b.quantity / b.capital_at_entry * 100, 3) as risk_pct,
  case when b.take_profit is not null
       then round(abs(b.take_profit - b.entry_price) / b.risk_per_unit, 3)
  end                                                               as planned_rr,
  case when b.status = 'closed'
       then round(b.dir_sign * (b.exit_price - b.entry_price) * b.quantity, 4)
  end                                                               as gross_pnl,
  case when b.status = 'closed'
       then round(b.dir_sign * (b.exit_price - b.entry_price) * b.quantity - b.fees, 4)
  end                                                               as net_pnl,
  case when b.status = 'closed'
       then round((b.dir_sign * (b.exit_price - b.entry_price) * b.quantity - b.fees)
                  / b.capital_at_entry * 100, 3)
  end                                                               as pnl_pct,
  case when b.status = 'closed'
       then round((b.dir_sign * (b.exit_price - b.entry_price) * b.quantity - b.fees)
                  / (b.risk_per_unit * b.quantity), 3)
  end                                                               as r_multiple,
  coalesce(c.rules_passed, 0)                                       as rules_passed,
  coalesce(r.rules_total, 0)                                        as rules_total,
  case when coalesce(r.rules_total, 0) > 0
       then round(coalesce(c.rules_passed, 0)::numeric / r.rules_total * 100, 1)
  end                                                               as compliance_pct,
  (coalesce(b.exit_at, b.entry_at, b.created_at) at time zone 'Europe/Madrid')::date as local_date
from base b
left join checks c on c.trade_id = b.id
left join rules  r on r.strategy_id = b.strategy_id;

-- P&L per dia (zona Europe/Madrid), només operacions tancades
create or replace view v_daily_pnl
with (security_invoker = true) as
select
  account_id,
  local_date as day,
  count(*)                                   as trades,
  count(*) filter (where net_pnl > 0)        as wins,
  count(*) filter (where net_pnl < 0)        as losses,
  round(sum(net_pnl), 4)                     as net_pnl,
  round(sum(r_multiple), 3)                  as total_r,
  round(sum(fees), 4)                        as fees
from v_trade_metrics
where status = 'closed'
group by account_id, local_date;

-- Capital actual per compte
create or replace view v_account_balance
with (security_invoker = true) as
select
  a.id as account_id, a.name, a.type, a.currency, a.initial_capital,
  round(a.initial_capital + coalesce(sum(m.net_pnl), 0), 2) as current_capital,
  round(coalesce(sum(m.net_pnl), 0), 2)                    as realized_pnl
from accounts a
left join v_trade_metrics m on m.account_id = a.id and m.status = 'closed'
group by a.id;

-- Cost de cada etiqueta (errors, emocions, setups)
create or replace view v_tag_stats
with (security_invoker = true) as
select
  tg.id as tag_id, tg.name, tg.kind, tg.color,
  count(m.id)                                        as trades,
  count(m.id) filter (where m.net_pnl > 0)           as wins,
  round(coalesce(sum(m.net_pnl), 0), 2)              as net_pnl,
  round(coalesce(sum(m.net_pnl) filter (where m.net_pnl < 0), 0), 2) as losses_pnl,
  round(avg(m.r_multiple), 3)                        as avg_r
from tags tg
left join trade_tags tt on tt.tag_id = tg.id
left join v_trade_metrics m on m.id = tt.trade_id and m.status = 'closed'
group by tg.id;

-- Rendiment de cada regla segons si es va complir o no
create or replace view v_rule_stats
with (security_invoker = true) as
select
  r.id as rule_id, r.strategy_id, r.text, r.sort_order,
  c.passed,
  count(m.id)                                  as trades,
  count(m.id) filter (where m.net_pnl > 0)     as wins,
  round(coalesce(sum(m.net_pnl), 0), 2)        as net_pnl,
  round(avg(m.r_multiple), 3)                  as avg_r
from strategy_rules r
join trade_rule_checks c on c.rule_id = r.id
join v_trade_metrics m on m.id = c.trade_id and m.status = 'closed'
group by r.id, c.passed;

revoke all on v_trade_metrics, v_daily_pnl, v_account_balance, v_tag_stats, v_rule_stats from anon, authenticated;

-- ===== 20261121000003_storage.sql =====
-- Bucket per a les captures. És públic de lectura perquè les imatges es
-- puguin mostrar amb <img>; els noms són UUID aleatoris i no es poden llistar
-- sense la service role. Només el servidor hi pot escriure.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ===== 20261121000004_grants.sql =====
-- Permisos explícits per a la clau de servidor (service_role).
-- Alguns projectes nous de Supabase no els donen automàticament a les taules creades per SQL.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
