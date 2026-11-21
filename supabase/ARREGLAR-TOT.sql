-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ TradeLab · ARREGLAR-TOT                                                ║
-- ║ 1) Arregla la taula "settings" si n'hi havia una altra (es reanomena    ║
-- ║    a settings_antiga, no s'esborra res).                               ║
-- ║ 2) Dona permisos a la clau de servidor.                                ║
-- ║ 3) Carrega les dades d'exemple.                                        ║
-- ║ Es pot executar més d'una vegada. NO executis 1-estructura.sql de nou. ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- TradeLab · arregla la taula "settings" si ja n'existia una altra amb una estructura diferent.
-- NO esborra res: la taula antiga es reanomena a "settings_antiga". Es pot executar més d'una vegada.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'settings')
     and (not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'settings' and column_name = 'id')
          or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'settings' and column_name = 'default_risk_pct')) then
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


-- TradeLab · permisos per a la clau de servidor. Es pot executar tantes vegades com calgui.

-- Permisos explícits per a la clau de servidor (service_role).
-- Alguns projectes nous de Supabase no els donen automàticament a les taules creades per SQL.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;


-- ===== Dades d'exemple =====
-- Generat per scripts/generate-seed.ts — no editar a mà.
begin;
truncate accounts, assets, strategies, strategy_rules, analyses, trades, trade_rule_checks,
  tags, trade_tags, market_reports, concepts, concept_examples, media, goals,
  practice_attempts, settings, idempotency_keys cascade;

insert into accounts (id, name, type, initial_capital, currency, is_default) values
  ('a0000000-0000-4000-8000-000000000001', 'Paper TradingView', 'paper', 150, 'EUR', true),
  ('a0000000-0000-4000-8000-000000000002', 'Compte real (futur)', 'real', 0, 'EUR', false);

insert into assets (id, symbol, type, is_favorite) values
  ('b0000000-0000-4000-8000-000000000001', 'BTC/USDT', 'crypto', true),
  ('b0000000-0000-4000-8000-000000000002', 'ETH/USDT', 'crypto', true),
  ('b0000000-0000-4000-8000-000000000003', 'SOL/USDT', 'crypto', true),
  ('b0000000-0000-4000-8000-000000000004', 'XRP/USDT', 'crypto', false);

insert into settings (id, default_account_id, currency, default_risk_pct, risk_warning_pct,
  max_daily_loss, max_weekly_loss, max_trades_per_day, timezone, locale) values
  (1, 'a0000000-0000-4000-8000-000000000001', 'EUR', 3, 2, 9, 20, 4, 'Europe/Madrid', 'ca');

insert into strategies (id, name, version, description_md, is_active, created_at) values
  ('c0000000-0000-4000-8000-000000000001', 'MTF MA50', 1, '## Idea
Operar **a favor del biaix de 1H** i entrar només quan l''estructura de 5m ho confirma. L''execució es fa a 1m per ajustar l''stop.

## Temporalitats
| Temporalitat | Funció | Què miro |
|---|---|---|
| **1H** | Biaix | On aniran les properes espelmes. Preu respecte a la MA50 i pendent de la mitjana. |
| **5m** | Confirmació | Estructura: màxims i mínims creixents (o decreixents), impulsos i retrocessos. |
| **1m** | Execució | Gatell: trencament del darrer mínim/màxim del retrocés o espelma de rebuig. |

## Indicador
Una sola **MA50**. Per sobre → només llargs. Per sota → només curts. Preu enganxat i MA plana → **no opero**.

## Gestió del risc
- Risc per operació: **3 %** del capital (paper). Objectiu en real: ≤ 1 %.
- SL sempre definit **abans** d''entrar, darrere de l''estructura de 5m.
- TP mínim a **2R**. Si arriba a 1R, puc moure l''SL a break-even.
- Màxim 4 operacions al dia i aturar-me si perdo 9 € en un dia.
', false, now() - interval '64800 minutes'),
  ('c0000000-0000-4000-8000-000000000002', 'MTF MA50', 2, '## Idea
Operar **a favor del biaix de 1H** i entrar només quan l''estructura de 5m ho confirma. L''execució es fa a 1m per ajustar l''stop.

## Temporalitats
| Temporalitat | Funció | Què miro |
|---|---|---|
| **1H** | Biaix | On aniran les properes espelmes. Preu respecte a la MA50 i pendent de la mitjana. |
| **5m** | Confirmació | Estructura: màxims i mínims creixents (o decreixents), impulsos i retrocessos. |
| **1m** | Execució | Gatell: trencament del darrer mínim/màxim del retrocés o espelma de rebuig. |

## Indicador
Una sola **MA50**. Per sobre → només llargs. Per sota → només curts. Preu enganxat i MA plana → **no opero**.

## Gestió del risc
- Risc per operació: **2,5 %** del capital (paper). Objectiu en real: ≤ 1 %.
- SL sempre definit **abans** d''entrar, darrere de l''estructura de 5m.
- TP mínim a **2R**. Si arriba a 1R, puc moure l''SL a break-even.
- Màxim 4 operacions al dia i aturar-me si perdo 9 € en un dia.

## Canvis respecte a la v1
- Afegida la regla de *retrocés a zona* (no entrar en ple impuls).
- R:R mínim obligatori 1:2.
', true, now() - interval '30240 minutes');

insert into strategy_rules (id, strategy_id, text, sort_order, is_required) values
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Preu per sobre/sota la MA50 a 1H (biaix clar)', 1, true),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Estructura alcista/baixista confirmada a 5m', 2, true),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Gatell d''entrada a 1m', 3, true),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'SL definit abans d''entrar', 4, true),
  ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', 'Preu per sobre/sota la MA50 a 1H (biaix clar)', 1, true),
  ('d0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000002', 'Estructura alcista/baixista confirmada a 5m', 2, true),
  ('d0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000002', 'Retrocés a zona (MA50 o suport/resistència a 5m)', 3, true),
  ('d0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000002', 'Gatell d''entrada a 1m', 4, true),
  ('d0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000002', 'R:R ≥ 1:2', 5, true),
  ('d0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000002', 'SL definit abans d''entrar', 6, true);

insert into tags (id, name, kind, color) values
  ('e0000000-0000-4000-8000-00000000000b', 'FOMO', 'error', '#EF4444'),
  ('e0000000-0000-4000-8000-00000000000c', 'Entrada precipitada', 'error', '#EF4444'),
  ('e0000000-0000-4000-8000-00000000000d', 'Moure el SL', 'error', '#EF4444'),
  ('e0000000-0000-4000-8000-00000000000e', 'Sense setup', 'error', '#EF4444'),
  ('e0000000-0000-4000-8000-00000000000f', 'Sobreoperar', 'error', '#EF4444'),
  ('e0000000-0000-4000-8000-000000000010', 'Operació de revenja', 'error', '#EF4444'),
  ('e0000000-0000-4000-8000-000000000011', 'Tancar abans d''hora', 'error', '#EF4444'),
  ('e0000000-0000-4000-8000-000000000012', 'Calma', 'emotion', '#22D3EE'),
  ('e0000000-0000-4000-8000-000000000013', 'Confiança', 'emotion', '#22D3EE'),
  ('e0000000-0000-4000-8000-000000000014', 'Ansietat', 'emotion', '#22D3EE'),
  ('e0000000-0000-4000-8000-000000000015', 'Eufòria', 'emotion', '#22D3EE'),
  ('e0000000-0000-4000-8000-000000000016', 'Frustració', 'emotion', '#22D3EE'),
  ('e0000000-0000-4000-8000-000000000017', 'Por', 'emotion', '#22D3EE'),
  ('e0000000-0000-4000-8000-000000000018', 'Retrocés a MA50', 'setup', '#3B82F6'),
  ('e0000000-0000-4000-8000-000000000019', 'Ruptura i retest', 'setup', '#3B82F6'),
  ('e0000000-0000-4000-8000-00000000001a', 'Rebot en suport', 'setup', '#3B82F6'),
  ('e0000000-0000-4000-8000-00000000001b', 'Rebuig en resistència', 'setup', '#3B82F6');

insert into analyses (id, asset_id, title, timeframes, bias, levels, content_md, scenario, outcome, review_at, reviewed_at, my_notes, questions, source, analyzed_at, created_at) values
  ('f0000000-0000-4000-8000-00000000001c', 'b0000000-0000-4000-8000-000000000001', 'BTC: biaix alcista sobre la MA50', array['1H','5m']::text[], 'bullish',
   '{"supports":[91759],"resistances":[95105.5],"ma50":102156.3}'::jsonb, '### Què veig
- **1H:** el preu cotitza **per sobre de la MA50** (102.156,3) i la mitjana té pendent positiu. Els darrers mínims són creixents.
- **5m:** estructura alcista neta: impuls fort, retrocés ordenat fins a la zona de 91.759 i nou màxim.
- El volum acompanya els impulsos i s''asseca als retrocessos: bon senyal.

### Nivells clau
- Suport: **91.759** (mínim del retrocés + MA50 de 5m)
- Resistència: **95.105,5** (màxim previ)

### Escenari
Mentre BTC/USDT aguanti per sobre de 91.759, espero continuació cap a 95.105,5. Entrada ideal en un retrocés a la zona amb gatell a 1m.

### Què invalidaria l''anàlisi
Un tancament de 1H per sota de la MA50.', 'Continuació alcista cap a 95.105,5 mentre aguanti 91.759',
   'fulfilled', ((least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '34 days' + interval '542 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days')::date, (least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '34 days' + interval '542 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days',
   null,
   null, 'claude', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '34 days' + interval '542 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '34 days' + interval '542 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('f0000000-0000-4000-8000-00000000001d', 'b0000000-0000-4000-8000-000000000002', 'ETH: pèrdua de la MA50, biaix baixista', array['1H','5m']::text[], 'bearish',
   '{"supports":[3097.5],"resistances":[3214.76],"ma50":3231.06}'::jsonb, '### Què veig
- **1H:** el preu ha perdut la **MA50** (3.231,06) i ara la mitjana actua com a resistència. Màxims decreixents.
- **5m:** impuls baixista fort i retrocés feble cap a 3.214,76; els compradors no tenen força.

### Nivells clau
- Resistència: **3.214,76** (zona de rebuig + MA50)
- Suport: **3.097,5**

### Escenari
Biaix baixista mentre no recuperi 3.214,76. Busco curts en retrocessos cap a la resistència amb confirmació a 5m. Objectiu 3.097,5.

### Què invalidaria l''anàlisi
Recuperar la MA50 de 1H amb un tancament clar per sobre.', 'Caiguda cap a 3.097,5 mentre no recuperi 3.214,76',
   'failed', ((least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '30 days' + interval '483 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days')::date, (least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '30 days' + interval '483 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days',
   null,
   null, 'claude', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '30 days' + interval '483 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '30 days' + interval '483 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('f0000000-0000-4000-8000-00000000001e', 'b0000000-0000-4000-8000-000000000003', 'SOL: biaix alcista sobre la MA50', array['1H']::text[], 'bullish',
   '{"supports":[144.254],"resistances":[149.421],"ma50":162.514}'::jsonb, '### Què veig
- **1H:** el preu cotitza **per sobre de la MA50** (162,514) i la mitjana té pendent positiu. Els darrers mínims són creixents.
- **5m:** estructura alcista neta: impuls fort, retrocés ordenat fins a la zona de 144,254 i nou màxim.
- El volum acompanya els impulsos i s''asseca als retrocessos: bon senyal.

### Nivells clau
- Suport: **144,254** (mínim del retrocés + MA50 de 5m)
- Resistència: **149,421** (màxim previ)

### Escenari
Mentre SOL/USDT aguanti per sobre de 144,254, espero continuació cap a 149,421. Entrada ideal en un retrocés a la zona amb gatell a 1m.

### Què invalidaria l''anàlisi
Un tancament de 1H per sota de la MA50.', 'Continuació alcista cap a 149,421 mentre aguanti 144,254',
   'fulfilled', ((least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '497 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days')::date, (least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '497 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days',
   null,
   null, 'claude', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '497 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '497 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('f0000000-0000-4000-8000-00000000001f', 'b0000000-0000-4000-8000-000000000001', 'BTC: rang sobre la MA50 plana, sense biaix', array['1H','5m']::text[], 'neutral',
   '{"supports":[93477.2],"resistances":[96917.4],"ma50":94714.1}'::jsonb, '### Què veig
- **1H:** el preu està **enganxat a la MA50** (94.714,1) i la mitjana és plana. No hi ha biaix clar.
- **5m:** rang entre 93.477,2 i 96.917,4, amb mitges i trencaments falsos.

### Escenari
Segons la meva estratègia, **no opero** fins que el preu surti del rang i la MA50 agafi pendent. Vigilaré un trencament amb retest de 96.917,4 (llargs) o de 93.477,2 (curts).', 'Esperar sortida del rang 93.477,2–96.917,4',
   'partial', ((least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '22 days' + interval '491 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days')::date, (least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '22 days' + interval '491 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days',
   'Em costa veure quan la MA50 és ''plana''. Preguntar quin pendent es considera pla.',
   null, 'claude', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '22 days' + interval '491 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '22 days' + interval '491 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('f0000000-0000-4000-8000-000000000020', 'b0000000-0000-4000-8000-000000000002', 'ETH: biaix alcista sobre la MA50', array['1H','5m','1m']::text[], 'bullish',
   '{"supports":[3114.08],"resistances":[3225.26],"ma50":3226.06}'::jsonb, '### Què veig
- **1H:** el preu cotitza **per sobre de la MA50** (3.226,06) i la mitjana té pendent positiu. Els darrers mínims són creixents.
- **5m:** estructura alcista neta: impuls fort, retrocés ordenat fins a la zona de 3.114,08 i nou màxim.
- El volum acompanya els impulsos i s''asseca als retrocessos: bon senyal.

### Nivells clau
- Suport: **3.114,08** (mínim del retrocés + MA50 de 5m)
- Resistència: **3.225,26** (màxim previ)

### Escenari
Mentre ETH/USDT aguanti per sobre de 3.114,08, espero continuació cap a 3.225,26. Entrada ideal en un retrocés a la zona amb gatell a 1m.

### Què invalidaria l''anàlisi
Un tancament de 1H per sota de la MA50.', 'Continuació alcista cap a 3.225,26 mentre aguanti 3.114,08',
   'fulfilled', ((least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '17 days' + interval '537 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days')::date, (least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '17 days' + interval '537 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days',
   null,
   null, 'claude', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '17 days' + interval '537 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '17 days' + interval '537 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('f0000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000001', 'BTC: pèrdua de la MA50, biaix baixista', array['1H','5m']::text[], 'bearish',
   '{"supports":[90712.2],"resistances":[94425.5],"ma50":89213}'::jsonb, '### Què veig
- **1H:** el preu ha perdut la **MA50** (89.213) i ara la mitjana actua com a resistència. Màxims decreixents.
- **5m:** impuls baixista fort i retrocés feble cap a 94.425,5; els compradors no tenen força.

### Nivells clau
- Resistència: **94.425,5** (zona de rebuig + MA50)
- Suport: **90.712,2**

### Escenari
Biaix baixista mentre no recuperi 94.425,5. Busco curts en retrocessos cap a la resistència amb confirmació a 5m. Objectiu 90.712,2.

### Què invalidaria l''anàlisi
Recuperar la MA50 de 1H amb un tancament clar per sobre.', 'Caiguda cap a 90.712,2 mentre no recuperi 94.425,5',
   'fulfilled', ((least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '13 days' + interval '514 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days')::date, (least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '13 days' + interval '514 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days',
   null,
   null, 'claude', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '13 days' + interval '514 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '13 days' + interval '514 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('f0000000-0000-4000-8000-000000000022', 'b0000000-0000-4000-8000-000000000003', 'SOL: pèrdua de la MA50, biaix baixista', array['1H','5m']::text[], 'bearish',
   '{"supports":[143.187],"resistances":[147.694],"ma50":138.86}'::jsonb, '### Què veig
- **1H:** el preu ha perdut la **MA50** (138,86) i ara la mitjana actua com a resistència. Màxims decreixents.
- **5m:** impuls baixista fort i retrocés feble cap a 147,694; els compradors no tenen força.

### Nivells clau
- Resistència: **147,694** (zona de rebuig + MA50)
- Suport: **143,187**

### Escenari
Biaix baixista mentre no recuperi 147,694. Busco curts en retrocessos cap a la resistència amb confirmació a 5m. Objectiu 143,187.

### Què invalidaria l''anàlisi
Recuperar la MA50 de 1H amb un tancament clar per sobre.', 'Caiguda cap a 143,187 mentre no recuperi 147,694',
   'failed', ((least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '9 days' + interval '503 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days')::date, (least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '9 days' + interval '503 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days',
   'Vaig ignorar que a 1H hi havia una divergència. Revisar.',
   null, 'claude', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '9 days' + interval '503 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '9 days' + interval '503 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('f0000000-0000-4000-8000-000000000023', 'b0000000-0000-4000-8000-000000000001', 'BTC: biaix alcista sobre la MA50', array['1H','5m']::text[], 'bullish',
   '{"supports":[90762.4],"resistances":[93557.4],"ma50":97501.9}'::jsonb, '### Què veig
- **1H:** el preu cotitza **per sobre de la MA50** (97.501,9) i la mitjana té pendent positiu. Els darrers mínims són creixents.
- **5m:** estructura alcista neta: impuls fort, retrocés ordenat fins a la zona de 90.762,4 i nou màxim.
- El volum acompanya els impulsos i s''asseca als retrocessos: bon senyal.

### Nivells clau
- Suport: **90.762,4** (mínim del retrocés + MA50 de 5m)
- Resistència: **93.557,4** (màxim previ)

### Escenari
Mentre BTC/USDT aguanti per sobre de 90.762,4, espero continuació cap a 93.557,4. Entrada ideal en un retrocés a la zona amb gatell a 1m.

### Què invalidaria l''anàlisi
Un tancament de 1H per sota de la MA50.', 'Continuació alcista cap a 93.557,4 mentre aguanti 90.762,4',
   'fulfilled', ((least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '547 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days')::date, (least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '547 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days',
   null,
   null, 'claude', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '547 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '547 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('f0000000-0000-4000-8000-000000000024', 'b0000000-0000-4000-8000-000000000002', 'ETH: rang sobre la MA50 plana, sense biaix', array['1H']::text[], 'neutral',
   '{"supports":[3175.68],"resistances":[3312.88],"ma50":3335.78}'::jsonb, '### Què veig
- **1H:** el preu està **enganxat a la MA50** (3.335,78) i la mitjana és plana. No hi ha biaix clar.
- **5m:** rang entre 3.175,68 i 3.312,88, amb mitges i trencaments falsos.

### Escenari
Segons la meva estratègia, **no opero** fins que el preu surti del rang i la MA50 agafi pendent. Vigilaré un trencament amb retest de 3.312,88 (llargs) o de 3.175,68 (curts).', 'Esperar sortida del rang 3.175,68–3.312,88',
   'pending', ((least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '3 days' + interval '536 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days')::date, null,
   null,
   'Com distingeixo un rang d''un retrocés llarg?', 'claude', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '3 days' + interval '536 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '3 days' + interval '536 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('f0000000-0000-4000-8000-000000000025', 'b0000000-0000-4000-8000-000000000001', 'BTC: biaix alcista sobre la MA50', array['1H','5m']::text[], 'bullish',
   '{"supports":[90831.8],"resistances":[94669.3],"ma50":100320.8}'::jsonb, '### Què veig
- **1H:** el preu cotitza **per sobre de la MA50** (100.320,8) i la mitjana té pendent positiu. Els darrers mínims són creixents.
- **5m:** estructura alcista neta: impuls fort, retrocés ordenat fins a la zona de 90.831,8 i nou màxim.
- El volum acompanya els impulsos i s''asseca als retrocessos: bon senyal.

### Nivells clau
- Suport: **90.831,8** (mínim del retrocés + MA50 de 5m)
- Resistència: **94.669,3** (màxim previ)

### Escenari
Mentre BTC/USDT aguanti per sobre de 90.831,8, espero continuació cap a 94.669,3. Entrada ideal en un retrocés a la zona amb gatell a 1m.

### Què invalidaria l''anàlisi
Un tancament de 1H per sota de la MA50.', 'Continuació alcista cap a 94.669,3 mentre aguanti 90.831,8',
   'pending', ((least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '550 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days')::date, null,
   null,
   null, 'claude', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '550 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '550 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('f0000000-0000-4000-8000-000000000026', 'b0000000-0000-4000-8000-000000000003', 'SOL: biaix alcista sobre la MA50', array['1H','5m']::text[], 'bullish',
   '{"supports":[139.908],"resistances":[144.459],"ma50":148.6}'::jsonb, '### Què veig
- **1H:** el preu cotitza **per sobre de la MA50** (148,6) i la mitjana té pendent positiu. Els darrers mínims són creixents.
- **5m:** estructura alcista neta: impuls fort, retrocés ordenat fins a la zona de 139,908 i nou màxim.
- El volum acompanya els impulsos i s''asseca als retrocessos: bon senyal.

### Nivells clau
- Suport: **139,908** (mínim del retrocés + MA50 de 5m)
- Resistència: **144,459** (màxim previ)

### Escenari
Mentre SOL/USDT aguanti per sobre de 139,908, espero continuació cap a 144,459. Entrada ideal en un retrocés a la zona amb gatell a 1m.

### Què invalidaria l''anàlisi
Un tancament de 1H per sota de la MA50.', 'Continuació alcista cap a 144,459 mentre aguanti 139,908',
   'pending', ((least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '0 days' + interval '543 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')) + interval '3 days')::date, null,
   null,
   null, 'claude', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '0 days' + interval '543 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '0 days' + interval '543 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes'));

insert into trades (id, account_id, asset_id, strategy_id, analysis_id, direction, status, entry_at, exit_at,
  entry_price, stop_loss, take_profit, exit_price, quantity, leverage, fees, capital_at_entry,
  bias_1h, confirmation_5m, trigger_1m, setup, emotion_before, emotion_after, notes, lesson, created_at) values
  ('10000000-0000-4000-8000-000000000027', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '41 days' + interval '617 minutes') at time zone 'Europe/Madrid', now() - interval '164 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '41 days' + interval '685 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 3134.6, 3115.47, 3191.99, 3184.72,
   0.235233, 5, 0.2949, 150,
   'bullish', 'Retrocés a la MA50 de 5m amb mínim més alt', 'Rebuig amb metxa inferior llarga a 1m', 'Rebot en suport',
   'Confiança', 'Calma',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Esperar el retrocés: entrar en ple impuls em deixa l''SL massa lluny.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '41 days' + interval '617 minutes') at time zone 'Europe/Madrid', now() - interval '164 minutes')),
  ('10000000-0000-4000-8000-000000000028', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '40 days' + interval '598 minutes') at time zone 'Europe/Madrid', now() - interval '324 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '40 days' + interval '647 minutes') at time zone 'Europe/Madrid', now() - interval '185 minutes'), 141.733, 141.363, 142.658, 141.096,
   13.094189, 12, 0.7424, 161.5,
   'bullish', 'Impuls alcista + retrocés al 50 %', 'Rebuig amb metxa inferior llarga a 1m', 'Ruptura i retest',
   'Por', 'Calma',
   'Vaig entrar amb moure el sl. El mercat no em va donar la raó.',
   'Després de dues pèrdues seguides, parar i revisar.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '40 days' + interval '598 minutes') at time zone 'Europe/Madrid', now() - interval '324 minutes')),
  ('10000000-0000-4000-8000-000000000029', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '40 days' + interval '807 minutes') at time zone 'Europe/Madrid', now() - interval '267 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '40 days' + interval '889 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 95068.1, 94809.4, 95585.5, 94809.4,
   0.017674, 12, 0.6721, 152.41,
   'bullish', 'Retrocés a la MA50 de 5m amb mínim més alt', 'Trencament de la línia de tendència baixista de 1m', 'Ruptura i retest',
   'Calma', 'Calma',
   'Bona execució; el mercat simplement no hi va arribar.',
   'L''SL es posa abans d''entrar i no es toca.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '40 days' + interval '807 minutes') at time zone 'Europe/Madrid', now() - interval '267 minutes')),
  ('10000000-0000-4000-8000-00000000002a', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', null, 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '40 days' + interval '998 minutes') at time zone 'Europe/Madrid', now() - interval '137 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '40 days' + interval '1041 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 136.611, 137.368, 134.34, 137.883,
   5.832254, 6, 0.3187, 147.17,
   'bearish', 'Retrocés a la MA50 de 5m amb màxim més baix', 'Trencament de la línia de tendència alcista de 1m', 'Rebuig en resistència',
   'Por', 'Calma',
   'Vaig entrar amb moure el sl. El mercat no em va donar la raó.',
   'Deixar córrer fins al TP: tancar abans redueix l''R mitjà.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '40 days' + interval '998 minutes') at time zone 'Europe/Madrid', now() - interval '137 minutes')),
  ('10000000-0000-4000-8000-00000000002b', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', null, 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '38 days' + interval '650 minutes') at time zone 'Europe/Madrid', now() - interval '134 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '38 days' + interval '689 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 147.775, 148.528, 146.269, 146.384,
   5.554976, 6, 0.3284, 139.43,
   'bearish', 'Ruptura d''estructura baixista (BOS) a 5m', 'Trencament del mínim del retrocés a 1m', 'Rebuig en resistència',
   'Ansietat', 'Calma',
   'Vaig entrar amb entrada precipitada. Va sortir bé però no per les raons correctes.',
   'Deixar córrer fins al TP: tancar abans redueix l''R mitjà.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '38 days' + interval '650 minutes') at time zone 'Europe/Madrid', now() - interval '134 minutes')),
  ('10000000-0000-4000-8000-00000000002c', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', null, 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '37 days' + interval '555 minutes') at time zone 'Europe/Madrid', now() - interval '165 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '37 days' + interval '625 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 3064.49, 3072.53, 3044.39, 3072.53,
   0.547868, 12, 0.6716, 146.83,
   'bearish', 'Impuls baixista + retrocés al 50 %', 'Trencament del mínim del retrocés a 1m', 'Ruptura i retest',
   'Por', 'Ansietat',
   'Vaig entrar amb tancar abans d''hora i sobreoperar. El mercat no em va donar la raó.',
   'Després de dues pèrdues seguides, parar i revisar.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '37 days' + interval '555 minutes') at time zone 'Europe/Madrid', now() - interval '165 minutes')),
  ('10000000-0000-4000-8000-00000000002d', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '36 days' + interval '571 minutes') at time zone 'Europe/Madrid', now() - interval '212 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '36 days' + interval '599 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 3249.31, 3239.93, 3272.76, 3270.76,
   0.453365, 11, 0.5892, 141.75,
   'bullish', 'Màxims i mínims creixents a 5m', 'Trencament de la línia de tendència baixista de 1m', 'Rebot en suport',
   'Calma', 'Calma',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Després de dues pèrdues seguides, parar i revisar.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '36 days' + interval '571 minutes') at time zone 'Europe/Madrid', now() - interval '212 minutes')),
  ('10000000-0000-4000-8000-00000000002e', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '36 days' + interval '732 minutes') at time zone 'Europe/Madrid', now() - interval '135 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '36 days' + interval '772 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 94296.9, 93741.4, 95407.9, 94296.9,
   0.008149, 6, 0.3074, 150.89,
   'bullish', 'Màxims i mínims creixents a 5m', 'Trencament de la línia de tendència baixista de 1m', 'Ruptura i retest',
   'Por', 'Ansietat',
   'Vaig entrar amb fomo. Va sortir bé però no per les raons correctes.',
   'Si el biaix de 1H no és clar, no hi ha operació.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '36 days' + interval '732 minutes') at time zone 'Europe/Madrid', now() - interval '135 minutes')),
  ('10000000-0000-4000-8000-00000000002f', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '34 days' + interval '650 minutes') at time zone 'Europe/Madrid', now() - interval '230 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '34 days' + interval '695 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 3295.57, 3278.91, 3328.89, 3272.23,
   0.271153, 6, 0.3574, 150.58,
   'bullish', 'Retrocés a la MA50 de 5m amb mínim més alt', 'Trencament de la línia de tendència baixista de 1m', 'Ruptura i retest',
   'Eufòria', 'Calma',
   'Vaig entrar amb moure el sl. El mercat no em va donar la raó.',
   'Si el biaix de 1H no és clar, no hi ha operació.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '34 days' + interval '650 minutes') at time zone 'Europe/Madrid', now() - interval '230 minutes')),
  ('10000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000001c', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '34 days' + interval '727 minutes') at time zone 'Europe/Madrid', now() - interval '131 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '34 days' + interval '762 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 92531.5, 92273.7, 93304.9, 92531.5,
   0.016745, 11, 0.6198, 143.89,
   'bullish', 'Màxims i mínims creixents a 5m', 'Espelma envolvent alcista a 1m', 'Ruptura i retest',
   'Calma', 'Ansietat',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Esperar el retrocés: entrar en ple impuls em deixa l''SL massa lluny.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '34 days' + interval '727 minutes') at time zone 'Europe/Madrid', now() - interval '131 minutes')),
  ('10000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000001c', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '33 days' + interval '572 minutes') at time zone 'Europe/Madrid', now() - interval '152 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '33 days' + interval '629 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 88787.3, 88393.8, 89574.3, 88393.8,
   0.010923, 7, 0.3879, 143.27,
   'bullish', 'Retrocés a la MA50 de 5m amb mínim més alt', 'Trencament del màxim del retrocés a 1m', 'Ruptura i retest',
   'Confiança', 'Calma',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Esperar el retrocés: entrar en ple impuls em deixa l''SL massa lluny.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '33 days' + interval '572 minutes') at time zone 'Europe/Madrid', now() - interval '152 minutes')),
  ('10000000-0000-4000-8000-000000000032', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000001d', 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '31 days' + interval '579 minutes') at time zone 'Europe/Madrid', now() - interval '201 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '31 days' + interval '594 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 3032.71, 3041.17, 3011.56, 3014.43,
   0.491447, 11, 0.5962, 138.59,
   'bearish', 'Màxims i mínims decreixents a 5m', 'Trencament de la línia de tendència alcista de 1m', 'Retrocés a MA50',
   'Calma', 'Confiança',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'L''SL es posa abans d''entrar i no es toca.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '31 days' + interval '579 minutes') at time zone 'Europe/Madrid', now() - interval '201 minutes')),
  ('10000000-0000-4000-8000-000000000033', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '31 days' + interval '772 minutes') at time zone 'Europe/Madrid', now() - interval '109 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '31 days' + interval '786 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 94653, 94275.8, 95596, 94275.8,
   0.011689, 8, 0.4426, 146.98,
   'bullish', 'Retrocés a la MA50 de 5m amb mínim més alt', 'Trencament de la línia de tendència baixista de 1m', 'Ruptura i retest',
   'Confiança', 'Calma',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Si el biaix de 1H no és clar, no hi ha operació.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '31 days' + interval '772 minutes') at time zone 'Europe/Madrid', now() - interval '109 minutes')),
  ('10000000-0000-4000-8000-000000000034', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000001d', 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '30 days' + interval '644 minutes') at time zone 'Europe/Madrid', now() - interval '175 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '30 days' + interval '724 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 3068.67, 3083.21, 3039.59, 3083.21,
   0.293241, 7, 0.3599, 142.12,
   'bearish', 'Impuls baixista + retrocés al 50 %', 'Trencament del mínim del retrocés a 1m', 'Retrocés a MA50',
   'Calma', 'Frustració',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Esperar el retrocés: entrar en ple impuls em deixa l''SL massa lluny.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '30 days' + interval '644 minutes') at time zone 'Europe/Madrid', now() - interval '175 minutes')),
  ('10000000-0000-4000-8000-000000000035', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '29 days' + interval '629 minutes') at time zone 'Europe/Madrid', now() - interval '341 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '29 days' + interval '695 minutes') at time zone 'Europe/Madrid', now() - interval '185 minutes'), 94083.6, 93647.5, 95173.9, 93647.5,
   0.009459, 7, 0.356, 137.5,
   'bullish', 'Impuls alcista + retrocés al 50 %', 'Espelma envolvent alcista a 1m', 'Rebot en suport',
   'Por', 'Calma',
   'Vaig entrar amb fomo. El mercat no em va donar la raó.',
   'Una pèrdua de -1R és part del pla, no un error.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '29 days' + interval '629 minutes') at time zone 'Europe/Madrid', now() - interval '341 minutes')),
  ('10000000-0000-4000-8000-000000000036', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '29 days' + interval '795 minutes') at time zone 'Europe/Madrid', now() - interval '207 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '29 days' + interval '817 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 90668.4, 90329.9, 91683.9, 90329.9,
   0.011789, 9, 0.4276, 133.02,
   'bullish', 'Ruptura d''estructura alcista (BOS) a 5m', 'Trencament del màxim del retrocés a 1m', 'Retrocés a MA50',
   'Confiança', 'Ansietat',
   'Bona execució; el mercat simplement no hi va arribar.',
   'L''SL es posa abans d''entrar i no es toca.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '29 days' + interval '795 minutes') at time zone 'Europe/Madrid', now() - interval '207 minutes')),
  ('10000000-0000-4000-8000-000000000037', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000001d', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '29 days' + interval '959 minutes') at time zone 'Europe/Madrid', now() - interval '119 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '29 days' + interval '982 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 3063.05, 3053.19, 3082.77, 3053.19,
   0.391281, 10, 0.4794, 128.6,
   'bullish', 'Màxims i mínims creixents a 5m', 'Rebuig amb metxa inferior llarga a 1m', 'Retrocés a MA50',
   'Eufòria', 'Ansietat',
   'Vaig entrar amb tancar abans d''hora. El mercat no em va donar la raó.',
   'Si el biaix de 1H no és clar, no hi ha operació.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '29 days' + interval '959 minutes') at time zone 'Europe/Madrid', now() - interval '119 minutes')),
  ('10000000-0000-4000-8000-000000000038', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000001e', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '27 days' + interval '567 minutes') at time zone 'Europe/Madrid', now() - interval '120 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '27 days' + interval '593 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 138.916, 138.127, 140.888, 140.772,
   4.724852, 6, 0.2625, 124.26,
   'bullish', 'Impuls alcista + retrocés al 50 %', 'Trencament del màxim del retrocés a 1m', 'Ruptura i retest',
   'Calma', 'Confiança',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'L''SL es posa abans d''entrar i no es toca.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '27 days' + interval '567 minutes') at time zone 'Europe/Madrid', now() - interval '120 minutes')),
  ('10000000-0000-4000-8000-000000000039', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '640 minutes') at time zone 'Europe/Madrid', now() - interval '261 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '717 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 3310.8, 3290.99, 3350.42, 3290.99,
   0.201066, 6, 0.2663, 132.77,
   'bullish', 'Impuls alcista + retrocés al 50 %', 'Trencament de la línia de tendència baixista de 1m', 'Rebot en suport',
   'Eufòria', 'Calma',
   'Vaig entrar amb tancar abans d''hora. El mercat no em va donar la raó.',
   'Esperar el retrocés: entrar en ple impuls em deixa l''SL massa lluny.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '640 minutes') at time zone 'Europe/Madrid', now() - interval '261 minutes')),
  ('10000000-0000-4000-8000-00000000003a', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '816 minutes') at time zone 'Europe/Madrid', now() - interval '142 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '863 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 96227.8, 95685.8, 97311.8, 95685.8,
   0.007114, 6, 0.2738, 128.52,
   'bullish', 'Ruptura d''estructura alcista (BOS) a 5m', 'Rebuig amb metxa inferior llarga a 1m', 'Rebot en suport',
   'Confiança', 'Ansietat',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Deixar córrer fins al TP: tancar abans redueix l''R mitjà.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '816 minutes') at time zone 'Europe/Madrid', now() - interval '142 minutes')),
  ('10000000-0000-4000-8000-00000000003b', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '24 days' + interval '653 minutes') at time zone 'Europe/Madrid', now() - interval '289 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '24 days' + interval '668 minutes') at time zone 'Europe/Madrid', now() - interval '185 minutes'), 144.702, 144.143, 145.82, 145.7,
   6.675746, 8, 0.3864, 124.39,
   'bullish', 'Impuls alcista + retrocés al 50 %', 'Trencament del màxim del retrocés a 1m', 'Ruptura i retest',
   'Ansietat', 'Calma',
   'Vaig entrar amb sense setup. Va sortir bé però no per les raons correctes.',
   'L''SL es posa abans d''entrar i no es toca.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '24 days' + interval '653 minutes') at time zone 'Europe/Madrid', now() - interval '289 minutes')),
  ('10000000-0000-4000-8000-00000000003c', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '24 days' + interval '821 minutes') at time zone 'Europe/Madrid', now() - interval '253 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '24 days' + interval '890 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 3201.21, 3185.27, 3233.09, 3185.27,
   0.245924, 7, 0.3149, 130.67,
   'bullish', 'Retrocés a la MA50 de 5m amb mínim més alt', 'Trencament de la línia de tendència baixista de 1m', 'Retrocés a MA50',
   'Ansietat', 'Ansietat',
   'Vaig entrar amb tancar abans d''hora. El mercat no em va donar la raó.',
   'Esperar el retrocés: entrar en ple impuls em deixa l''SL massa lluny.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '24 days' + interval '821 minutes') at time zone 'Europe/Madrid', now() - interval '253 minutes')),
  ('10000000-0000-4000-8000-00000000003d', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '24 days' + interval '946 minutes') at time zone 'Europe/Madrid', now() - interval '167 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '24 days' + interval '1018 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 3279.21, 3260.36, 3326.34, 3260.36,
   0.201219, 6, 0.2639, 126.43,
   'bullish', 'Ruptura d''estructura alcista (BOS) a 5m', 'Espelma envolvent alcista a 1m', 'Ruptura i retest',
   'Por', 'Ansietat',
   'Vaig entrar amb sobreoperar i entrada precipitada. El mercat no em va donar la raó.',
   'Esperar el retrocés: entrar en ple impuls em deixa l''SL massa lluny.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '24 days' + interval '946 minutes') at time zone 'Europe/Madrid', now() - interval '167 minutes')),
  ('10000000-0000-4000-8000-00000000003e', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000001f', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '23 days' + interval '593 minutes') at time zone 'Europe/Madrid', now() - interval '330 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '23 days' + interval '649 minutes') at time zone 'Europe/Madrid', now() - interval '185 minutes'), 96280.6, 95922.9, 97174.9, 95922.9,
   0.010264, 9, 0.3953, 122.38,
   'bullish', 'Impuls alcista + retrocés al 50 %', 'Espelma envolvent alcista a 1m', 'Rebot en suport',
   'Ansietat', 'Calma',
   'Vaig entrar amb operació de revenja. El mercat no em va donar la raó.',
   'Esperar el retrocés: entrar en ple impuls em deixa l''SL massa lluny.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '23 days' + interval '593 minutes') at time zone 'Europe/Madrid', now() - interval '330 minutes')),
  ('10000000-0000-4000-8000-00000000003f', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000001f', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '23 days' + interval '730 minutes') at time zone 'Europe/Madrid', now() - interval '263 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '23 days' + interval '808 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 97586.4, 96967.1, 99134.6, 96967.1,
   0.005731, 5, 0.2237, 118.31,
   'bullish', 'Retrocés a la MA50 de 5m amb mínim més alt', 'Trencament de la línia de tendència baixista de 1m', 'Rebot en suport',
   'Calma', 'Ansietat',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Després de dues pèrdues seguides, parar i revisar.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '23 days' + interval '730 minutes') at time zone 'Europe/Madrid', now() - interval '263 minutes')),
  ('10000000-0000-4000-8000-000000000040', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', null, 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '23 days' + interval '999 minutes') at time zone 'Europe/Madrid', now() - interval '175 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '23 days' + interval '1080 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 3120.05, 3131.57, 3085.49, 3087.41,
   0.298271, 9, 0.3722, 114.54,
   'bearish', 'Ruptura d''estructura baixista (BOS) a 5m', 'Trencament de la línia de tendència alcista de 1m', 'Ruptura i retest',
   'Confiança', 'Calma',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'L''SL es posa abans d''entrar i no es toca.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '23 days' + interval '999 minutes') at time zone 'Europe/Madrid', now() - interval '175 minutes')),
  ('10000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-00000000001f', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '22 days' + interval '653 minutes') at time zone 'Europe/Madrid', now() - interval '171 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '22 days' + interval '729 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 97795.1, 97180.8, 99023.7, 97180.8,
   0.006051, 5, 0.2367, 123.9,
   'bullish', 'Ruptura d''estructura alcista (BOS) a 5m', 'Rebuig amb metxa inferior llarga a 1m', 'Retrocés a MA50',
   'Calma', 'Ansietat',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Deixar córrer fins al TP: tancar abans redueix l''R mitjà.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '22 days' + interval '653 minutes') at time zone 'Europe/Madrid', now() - interval '171 minutes')),
  ('10000000-0000-4000-8000-000000000042', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '20 days' + interval '635 minutes') at time zone 'Europe/Madrid', now() - interval '126 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '20 days' + interval '666 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 139.258, 138.524, 141.46, 141.248,
   4.085341, 5, 0.2276, 119.95,
   'bullish', 'Retrocés a la MA50 de 5m amb mínim més alt', 'Trencament del màxim del retrocés a 1m', 'Rebot en suport',
   'Calma', 'Calma',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Esperar el retrocés: entrar en ple impuls em deixa l''SL massa lluny.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '20 days' + interval '635 minutes') at time zone 'Europe/Madrid', now() - interval '126 minutes')),
  ('10000000-0000-4000-8000-000000000043', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '19 days' + interval '588 minutes') at time zone 'Europe/Madrid', now() - interval '173 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '19 days' + interval '666 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 3192.08, 3180.34, 3221.43, 3218.6,
   0.272248, 7, 0.3476, 127.85,
   'bullish', 'Retrocés a la MA50 de 5m amb mínim més alt', 'Trencament del màxim del retrocés a 1m', 'Retrocés a MA50',
   'Calma', 'Calma',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Deixar córrer fins al TP: tancar abans redueix l''R mitjà.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '19 days' + interval '588 minutes') at time zone 'Europe/Madrid', now() - interval '173 minutes')),
  ('10000000-0000-4000-8000-000000000044', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', null, 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '17 days' + interval '607 minutes') at time zone 'Europe/Madrid', now() - interval '217 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '17 days' + interval '639 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 143.673, 144.333, 142.353, 142.419,
   5.103038, 6, 0.2933, 134.72,
   'bearish', 'Ruptura d''estructura baixista (BOS) a 5m', 'Espelma envolvent baixista a 1m', 'Ruptura i retest',
   'Calma', 'Confiança',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Una pèrdua de -1R és part del pla, no un error.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '17 days' + interval '607 minutes') at time zone 'Europe/Madrid', now() - interval '217 minutes')),
  ('10000000-0000-4000-8000-000000000045', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000020', 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '17 days' + interval '827 minutes') at time zone 'Europe/Madrid', now() - interval '118 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '17 days' + interval '850 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 3364.42, 3372.97, 3347.32, 3348.51,
   0.411772, 10, 0.5541, 140.83,
   'bearish', 'Màxims i mínims decreixents a 5m', 'Rebuig amb metxa superior llarga a 1m', 'Rebuig en resistència',
   'Confiança', 'Confiança',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'L''SL es posa abans d''entrar i no es toca.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '17 days' + interval '827 minutes') at time zone 'Europe/Madrid', now() - interval '118 minutes')),
  ('10000000-0000-4000-8000-000000000046', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '16 days' + interval '656 minutes') at time zone 'Europe/Madrid', now() - interval '111 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '16 days' + interval '671 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 97717.9, 97166.9, 98819.9, 98695.2,
   0.006662, 5, 0.2604, 146.82,
   'bullish', 'Impuls alcista + retrocés al 50 %', 'Rebuig amb metxa inferior llarga a 1m', 'Rebot en suport',
   'Confiança', 'Confiança',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Si el biaix de 1H no és clar, no hi ha operació.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '16 days' + interval '656 minutes') at time zone 'Europe/Madrid', now() - interval '111 minutes')),
  ('10000000-0000-4000-8000-000000000047', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '15 days' + interval '613 minutes') at time zone 'Europe/Madrid', now() - interval '307 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '15 days' + interval '645 minutes') at time zone 'Europe/Madrid', now() - interval '185 minutes'), 92296.5, 92026.8, 92835.9, 92818.1,
   0.014189, 9, 0.5238, 153.07,
   'bullish', 'Ruptura d''estructura alcista (BOS) a 5m', 'Espelma envolvent alcista a 1m', 'Retrocés a MA50',
   'Calma', 'Confiança',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'L''SL es posa abans d''entrar i no es toca.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '15 days' + interval '613 minutes') at time zone 'Europe/Madrid', now() - interval '307 minutes')),
  ('10000000-0000-4000-8000-000000000048', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '15 days' + interval '832 minutes') at time zone 'Europe/Madrid', now() - interval '200 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '15 days' + interval '846 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 92480.5, 92220.1, 93131.5, 92220.1,
   0.015356, 9, 0.5681, 159.95,
   'bullish', 'Màxims i mínims creixents a 5m', 'Trencament del màxim del retrocés a 1m', 'Retrocés a MA50',
   'Eufòria', 'Frustració',
   'Vaig entrar amb operació de revenja. El mercat no em va donar la raó.',
   'Deixar córrer fins al TP: tancar abans redueix l''R mitjà.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '15 days' + interval '832 minutes') at time zone 'Europe/Madrid', now() - interval '200 minutes')),
  ('10000000-0000-4000-8000-000000000049', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', null, 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '15 days' + interval '907 minutes') at time zone 'Europe/Madrid', now() - interval '109 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '15 days' + interval '921 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 95070.2, 95375.5, 94459.6, 95375.5,
   0.012724, 8, 0.4839, 155.38,
   'bearish', 'Impuls baixista + retrocés al 50 %', 'Trencament del mínim del retrocés a 1m', 'Retrocés a MA50',
   'Confiança', 'Ansietat',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Deixar córrer fins al TP: tancar abans redueix l''R mitjà.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '15 days' + interval '907 minutes') at time zone 'Europe/Madrid', now() - interval '109 minutes')),
  ('10000000-0000-4000-8000-00000000004a', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '13 days' + interval '591 minutes') at time zone 'Europe/Madrid', now() - interval '158 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '13 days' + interval '654 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 3124.9, 3112.55, 3149.6, 3112.55,
   0.3057, 7, 0.3821, 151.02,
   'bullish', 'Ruptura d''estructura alcista (BOS) a 5m', 'Espelma envolvent alcista a 1m', 'Retrocés a MA50',
   'Confiança', 'Ansietat',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Deixar córrer fins al TP: tancar abans redueix l''R mitjà.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '13 days' + interval '591 minutes') at time zone 'Europe/Madrid', now() - interval '158 minutes')),
  ('10000000-0000-4000-8000-00000000004b', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '12 days' + interval '563 minutes') at time zone 'Europe/Madrid', now() - interval '111 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '12 days' + interval '578 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 3152.6, 3141.92, 3173.96, 3170.78,
   0.343769, 8, 0.4335, 146.86,
   'bullish', 'Màxims i mínims creixents a 5m', 'Trencament de la línia de tendència baixista de 1m', 'Ruptura i retest',
   'Confiança', 'Calma',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Una pèrdua de -1R és part del pla, no un error.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '12 days' + interval '563 minutes') at time zone 'Europe/Madrid', now() - interval '111 minutes')),
  ('10000000-0000-4000-8000-00000000004c', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '10 days' + interval '629 minutes') at time zone 'Europe/Madrid', now() - interval '255 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '10 days' + interval '700 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 3367.5, 3356.7, 3399.9, 3397.93,
   0.353413, 8, 0.476, 152.67,
   'bullish', 'Retrocés a la MA50 de 5m amb mínim més alt', 'Trencament del màxim del retrocés a 1m', 'Ruptura i retest',
   'Confiança', 'Calma',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Deixar córrer fins al TP: tancar abans redueix l''R mitjà.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '10 days' + interval '629 minutes') at time zone 'Europe/Madrid', now() - interval '255 minutes')),
  ('10000000-0000-4000-8000-00000000004d', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '10 days' + interval '770 minutes') at time zone 'Europe/Madrid', now() - interval '115 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '10 days' + interval '790 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 98386, 97983.5, 99191, 99090.9,
   0.010121, 7, 0.3983, 162.95,
   'bullish', 'Retrocés a la MA50 de 5m amb mínim més alt', 'Rebuig amb metxa inferior llarga a 1m', 'Rebot en suport',
   'Calma', 'Calma',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Esperar el retrocés: entrar en ple impuls em deixa l''SL massa lluny.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '10 days' + interval '770 minutes') at time zone 'Europe/Madrid', now() - interval '115 minutes')),
  ('10000000-0000-4000-8000-00000000004e', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', null, 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '9 days' + interval '595 minutes') at time zone 'Europe/Madrid', now() - interval '134 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '9 days' + interval '635 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 92184.2, 92435.7, 91681.2, 92435.7,
   0.016868, 10, 0.622, 169.69,
   'bearish', 'Màxims i mínims decreixents a 5m', 'Espelma envolvent baixista a 1m', 'Retrocés a MA50',
   'Calma', 'Calma',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Una pèrdua de -1R és part del pla, no un error.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '9 days' + interval '595 minutes') at time zone 'Europe/Madrid', now() - interval '134 minutes')),
  ('10000000-0000-4000-8000-00000000004f', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000022', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '8 days' + interval '581 minutes') at time zone 'Europe/Madrid', now() - interval '253 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '8 days' + interval '649 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 144.56, 143.656, 147.272, 147.038,
   4.558197, 4, 0.2636, 164.82,
   'bullish', 'Màxims i mínims creixents a 5m', 'Rebuig amb metxa inferior llarga a 1m', 'Retrocés a MA50',
   'Confiança', 'Confiança',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Si el biaix de 1H no és clar, no hi ha operació.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '8 days' + interval '581 minutes') at time zone 'Europe/Madrid', now() - interval '253 minutes')),
  ('10000000-0000-4000-8000-000000000050', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '8 days' + interval '827 minutes') at time zone 'Europe/Madrid', now() - interval '130 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '8 days' + interval '862 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 91392.7, 90898, 92382.1, 90898,
   0.008887, 5, 0.3249, 175.86,
   'bullish', 'Ruptura d''estructura alcista (BOS) a 5m', 'Espelma envolvent alcista a 1m', 'Rebot en suport',
   'Calma', 'Calma',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Deixar córrer fins al TP: tancar abans redueix l''R mitjà.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '8 days' + interval '827 minutes') at time zone 'Europe/Madrid', now() - interval '130 minutes')),
  ('10000000-0000-4000-8000-000000000051', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000023', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '607 minutes') at time zone 'Europe/Madrid', now() - interval '226 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '648 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 96011.3, 95427.6, 97470.5, 95427.6,
   0.00733, 5, 0.2815, 171.13,
   'bullish', 'Màxims i mínims creixents a 5m', 'Espelma envolvent alcista a 1m', 'Rebot en suport',
   'Confiança', 'Frustració',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Una pèrdua de -1R és part del pla, no un error.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '607 minutes') at time zone 'Europe/Madrid', now() - interval '226 minutes')),
  ('10000000-0000-4000-8000-000000000052', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000023', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '729 minutes') at time zone 'Europe/Madrid', now() - interval '138 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '772 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 93147.8, 92576.8, 94289.8, 94222.9,
   0.007293, 5, 0.2717, 166.57,
   'bullish', 'Impuls alcista + retrocés al 50 %', 'Rebuig amb metxa inferior llarga a 1m', 'Ruptura i retest',
   'Confiança', 'Confiança',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Una pèrdua de -1R és part del pla, no un error.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '729 minutes') at time zone 'Europe/Madrid', now() - interval '138 minutes')),
  ('10000000-0000-4000-8000-000000000053', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', null, 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '5 days' + interval '588 minutes') at time zone 'Europe/Madrid', now() - interval '300 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '5 days' + interval '613 minutes') at time zone 'Europe/Madrid', now() - interval '185 minutes'), 3331.42, 3343.2, 3307.86, 3352.18,
   0.369575, 8, 0.4925, 174.14,
   'bearish', 'Retrocés a la MA50 de 5m amb màxim més baix', 'Rebuig amb metxa superior llarga a 1m', 'Retrocés a MA50',
   'Eufòria', 'Ansietat',
   'Vaig entrar amb moure el sl. El mercat no em va donar la raó.',
   'Després de dues pèrdues seguides, parar i revisar.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '5 days' + interval '588 minutes') at time zone 'Europe/Madrid', now() - interval '300 minutes')),
  ('10000000-0000-4000-8000-000000000054', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '5 days' + interval '730 minutes') at time zone 'Europe/Madrid', now() - interval '222 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '5 days' + interval '768 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 3175.46, 3155.46, 3215.46, 3213.87,
   0.207474, 4, 0.2635, 165.98,
   'bullish', 'Màxims i mínims creixents a 5m', 'Trencament del màxim del retrocés a 1m', 'Ruptura i retest',
   'Calma', 'Confiança',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Una pèrdua de -1R és part del pla, no un error.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '5 days' + interval '730 minutes') at time zone 'Europe/Madrid', now() - interval '222 minutes')),
  ('10000000-0000-4000-8000-000000000055', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '5 days' + interval '895 minutes') at time zone 'Europe/Madrid', now() - interval '114 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '5 days' + interval '914 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 3106.42, 3097.98, 3131.74, 3097.98,
   0.514468, 10, 0.6393, 173.68,
   'bullish', 'Màxims i mínims creixents a 5m', 'Espelma envolvent alcista a 1m', 'Rebot en suport',
   'Calma', 'Frustració',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Si el biaix de 1H no és clar, no hi ha operació.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '5 days' + interval '895 minutes') at time zone 'Europe/Madrid', now() - interval '114 minutes')),
  ('10000000-0000-4000-8000-000000000056', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', null, 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '4 days' + interval '571 minutes') at time zone 'Europe/Madrid', now() - interval '248 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '4 days' + interval '633 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 94653.9, 95212.9, 93256.4, 95212.9,
   0.007545, 5, 0.2857, 168.7,
   'bearish', 'Màxims i mínims decreixents a 5m', 'Espelma envolvent baixista a 1m', 'Ruptura i retest',
   'Confiança', 'Ansietat',
   'Bona execució; el mercat simplement no hi va arribar.',
   'L''SL es posa abans d''entrar i no es toca.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '4 days' + interval '571 minutes') at time zone 'Europe/Madrid', now() - interval '248 minutes')),
  ('10000000-0000-4000-8000-000000000057', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '4 days' + interval '779 minutes') at time zone 'Europe/Madrid', now() - interval '135 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '4 days' + interval '819 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 95183.4, 94938.5, 95918.1, 95816.2,
   0.016762, 10, 0.6382, 164.2,
   'bullish', 'Impuls alcista + retrocés al 50 %', 'Rebuig amb metxa inferior llarga a 1m', 'Ruptura i retest',
   'Por', 'Calma',
   'Vaig entrar amb operació de revenja. Va sortir bé però no per les raons correctes.',
   'Esperar el retrocés: entrar en ple impuls em deixa l''SL massa lluny.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '4 days' + interval '779 minutes') at time zone 'Europe/Madrid', now() - interval '135 minutes')),
  ('10000000-0000-4000-8000-000000000058', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', null, 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '3 days' + interval '560 minutes') at time zone 'Europe/Madrid', now() - interval '128 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '3 days' + interval '593 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 96415.4, 96663.6, 95794.9, 96663.6,
   0.017543, 10, 0.6766, 174.17,
   'bearish', 'Retrocés a la MA50 de 5m amb màxim més baix', 'Espelma envolvent baixista a 1m', 'Rebuig en resistència',
   'Calma', 'Ansietat',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Després de dues pèrdues seguides, parar i revisar.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '3 days' + interval '560 minutes') at time zone 'Europe/Madrid', now() - interval '128 minutes')),
  ('10000000-0000-4000-8000-000000000059', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000025', 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '2 days' + interval '644 minutes') at time zone 'Europe/Madrid', now() - interval '266 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '2 days' + interval '725 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 94584.3, 95023.9, 93265.5, 93362.4,
   0.009619, 6, 0.3639, 169.14,
   'bearish', 'Ruptura d''estructura baixista (BOS) a 5m', 'Trencament de la línia de tendència alcista de 1m', 'Ruptura i retest',
   'Confiança', 'Confiança',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Esperar el retrocés: entrar en ple impuls em deixa l''SL massa lluny.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '2 days' + interval '644 minutes') at time zone 'Europe/Madrid', now() - interval '266 minutes')),
  ('10000000-0000-4000-8000-00000000005a', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000025', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '2 days' + interval '804 minutes') at time zone 'Europe/Madrid', now() - interval '167 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '2 days' + interval '877 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 98692.9, 98366.9, 99344.9, 98366.9,
   0.013844, 8, 0.5465, 180.53,
   'bullish', 'Impuls alcista + retrocés al 50 %', 'Espelma envolvent alcista a 1m', 'Retrocés a MA50',
   'Calma', 'Calma',
   'Bona execució; el mercat simplement no hi va arribar.',
   'L''SL es posa abans d''entrar i no es toca.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '2 days' + interval '804 minutes') at time zone 'Europe/Madrid', now() - interval '167 minutes')),
  ('10000000-0000-4000-8000-00000000005b', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000026', 'short', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '567 minutes') at time zone 'Europe/Madrid', now() - interval '330 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '621 minutes') at time zone 'Europe/Madrid', now() - interval '185 minutes'), 144.865, 145.406, 143.242, 143.311,
   8.108484, 7, 0.4699, 175.47,
   'bearish', 'Ruptura d''estructura baixista (BOS) a 5m', 'Rebuig amb metxa superior llarga a 1m', 'Rebuig en resistència',
   'Confiança', 'Calma',
   'Setup de manual: biaix, estructura i gatell alineats.',
   'Deixar córrer fins al TP: tancar abans redueix l''R mitjà.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '567 minutes') at time zone 'Europe/Madrid', now() - interval '330 minutes')),
  ('10000000-0000-4000-8000-00000000005c', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000025', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '812 minutes') at time zone 'Europe/Madrid', now() - interval '240 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '867 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes'), 91997.7, 91670, 92816.9, 91670,
   0.014312, 8, 0.5267, 187.6,
   'bullish', 'Impuls alcista + retrocés al 50 %', 'Trencament de la línia de tendència baixista de 1m', 'Rebot en suport',
   'Confiança', 'Calma',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Deixar córrer fins al TP: tancar abans redueix l''R mitjà.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '812 minutes') at time zone 'Europe/Madrid', now() - interval '240 minutes')),
  ('10000000-0000-4000-8000-00000000005d', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000025', 'long', 'closed',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '895 minutes') at time zone 'Europe/Madrid', now() - interval '138 minutes'), least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '939 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes'), 91793.7, 91539.1, 92302.9, 91539.1,
   0.017909, 10, 0.6576, 182.38,
   'bullish', 'Retrocés a la MA50 de 5m amb mínim més alt', 'Espelma envolvent alcista a 1m', 'Ruptura i retest',
   'Confiança', 'Calma',
   'Bona execució; el mercat simplement no hi va arribar.',
   'Si el biaix de 1H no és clar, no hi ha operació.', least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '895 minutes') at time zone 'Europe/Madrid', now() - interval '138 minutes')),
  ('10000000-0000-4000-8000-00000000005e', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000026', 'long', 'open',
   least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '0 days' + interval '651 minutes') at time zone 'Europe/Madrid', now() - interval '143 minutes'), null, 154.663, 153.94, 156.832, null,
   6.126017, 6, 0, 177.16,
   'bullish', 'Màxims i mínims creixents a 5m', 'Trencament del màxim del retrocés a 1m', 'Retrocés a MA50',
   'Confiança', null,
   'Setup de manual: biaix, estructura i gatell alineats.',
   null, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '0 days' + interval '651 minutes') at time zone 'Europe/Madrid', now() - interval '143 minutes')),
  ('10000000-0000-4000-8000-00000000005f', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', null, 'long', 'planned', null, null, 3260.4, 3244.1, 3301.15, null, 0.271725, 5, 0, 177.16,
   'bullish', 'Esperant retrocés a la MA50 de 5m', null, 'Retrocés a MA50', null, null, 'Pla creat des de la calculadora.', null, now() - interval '45 minutes'),
  ('10000000-0000-4000-8000-000000000060', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', null, 'short', 'cancelled', null, null, 146.26, 147.138, 144.504, null, 5.0445, 3, 0, 177.16,
   'bearish', null, null, 'Rebuig en resistència', 'Ansietat', null, 'Cancel·lada: el biaix de 1H va canviar abans d''entrar.', null, now() - interval '3080 minutes');

insert into trade_rule_checks (trade_id, rule_id, passed) values
  ('10000000-0000-4000-8000-000000000027', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000027', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000027', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000027', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000028', 'd0000000-0000-4000-8000-000000000001', false),
  ('10000000-0000-4000-8000-000000000028', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000028', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000028', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000029', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000029', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000029', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000029', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-00000000002a', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-00000000002a', 'd0000000-0000-4000-8000-000000000002', false),
  ('10000000-0000-4000-8000-00000000002a', 'd0000000-0000-4000-8000-000000000003', false),
  ('10000000-0000-4000-8000-00000000002a', 'd0000000-0000-4000-8000-000000000004', false),
  ('10000000-0000-4000-8000-00000000002b', 'd0000000-0000-4000-8000-000000000001', false),
  ('10000000-0000-4000-8000-00000000002b', 'd0000000-0000-4000-8000-000000000002', false),
  ('10000000-0000-4000-8000-00000000002b', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-00000000002b', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-00000000002c', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-00000000002c', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-00000000002c', 'd0000000-0000-4000-8000-000000000003', false),
  ('10000000-0000-4000-8000-00000000002c', 'd0000000-0000-4000-8000-000000000004', false),
  ('10000000-0000-4000-8000-00000000002d', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-00000000002d', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-00000000002d', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-00000000002d', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-00000000002e', 'd0000000-0000-4000-8000-000000000001', false),
  ('10000000-0000-4000-8000-00000000002e', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-00000000002e', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-00000000002e', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-00000000002f', 'd0000000-0000-4000-8000-000000000001', false),
  ('10000000-0000-4000-8000-00000000002f', 'd0000000-0000-4000-8000-000000000002', false),
  ('10000000-0000-4000-8000-00000000002f', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-00000000002f', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000030', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000030', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000030', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000030', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000031', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000031', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000031', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000031', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000032', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000032', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000032', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000032', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000033', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000033', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000033', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000033', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000034', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000034', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000034', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000034', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000035', 'd0000000-0000-4000-8000-000000000001', false),
  ('10000000-0000-4000-8000-000000000035', 'd0000000-0000-4000-8000-000000000002', false),
  ('10000000-0000-4000-8000-000000000035', 'd0000000-0000-4000-8000-000000000003', false),
  ('10000000-0000-4000-8000-000000000035', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000036', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000036', 'd0000000-0000-4000-8000-000000000002', false),
  ('10000000-0000-4000-8000-000000000036', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000036', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000037', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000037', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000037', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000037', 'd0000000-0000-4000-8000-000000000004', false),
  ('10000000-0000-4000-8000-000000000038', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000038', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000038', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000038', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000039', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000039', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000039', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000039', 'd0000000-0000-4000-8000-000000000004', false),
  ('10000000-0000-4000-8000-00000000003a', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-00000000003a', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-00000000003a', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-00000000003a', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-00000000003b', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-00000000003b', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-00000000003b', 'd0000000-0000-4000-8000-000000000003', false),
  ('10000000-0000-4000-8000-00000000003b', 'd0000000-0000-4000-8000-000000000004', false),
  ('10000000-0000-4000-8000-00000000003c', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-00000000003c', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-00000000003c', 'd0000000-0000-4000-8000-000000000003', false),
  ('10000000-0000-4000-8000-00000000003c', 'd0000000-0000-4000-8000-000000000004', false),
  ('10000000-0000-4000-8000-00000000003d', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-00000000003d', 'd0000000-0000-4000-8000-000000000002', false),
  ('10000000-0000-4000-8000-00000000003d', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-00000000003d', 'd0000000-0000-4000-8000-000000000004', false),
  ('10000000-0000-4000-8000-00000000003e', 'd0000000-0000-4000-8000-000000000001', false),
  ('10000000-0000-4000-8000-00000000003e', 'd0000000-0000-4000-8000-000000000002', false),
  ('10000000-0000-4000-8000-00000000003e', 'd0000000-0000-4000-8000-000000000003', false),
  ('10000000-0000-4000-8000-00000000003e', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-00000000003f', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-00000000003f', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-00000000003f', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-00000000003f', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000040', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000040', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000040', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000040', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000041', 'd0000000-0000-4000-8000-000000000001', true),
  ('10000000-0000-4000-8000-000000000041', 'd0000000-0000-4000-8000-000000000002', true),
  ('10000000-0000-4000-8000-000000000041', 'd0000000-0000-4000-8000-000000000003', true),
  ('10000000-0000-4000-8000-000000000041', 'd0000000-0000-4000-8000-000000000004', true),
  ('10000000-0000-4000-8000-000000000042', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000042', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000042', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000042', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000042', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000042', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000043', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000043', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000043', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000043', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000043', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000043', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000044', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000044', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000044', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000044', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000044', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000044', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000045', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000045', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000045', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000045', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000045', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000045', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000046', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000046', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000046', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000046', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000046', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000046', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000047', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000047', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000047', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000047', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000047', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000047', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000048', 'd0000000-0000-4000-8000-000000000005', false),
  ('10000000-0000-4000-8000-000000000048', 'd0000000-0000-4000-8000-000000000006', false),
  ('10000000-0000-4000-8000-000000000048', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000048', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000048', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000048', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000049', 'd0000000-0000-4000-8000-000000000005', false),
  ('10000000-0000-4000-8000-000000000049', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000049', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000049', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000049', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000049', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-00000000004a', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-00000000004a', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-00000000004a', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-00000000004a', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-00000000004a', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-00000000004a', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-00000000004b', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-00000000004b', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-00000000004b', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-00000000004b', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-00000000004b', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-00000000004b', 'd0000000-0000-4000-8000-00000000000a', false),
  ('10000000-0000-4000-8000-00000000004c', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-00000000004c', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-00000000004c', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-00000000004c', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-00000000004c', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-00000000004c', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-00000000004d', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-00000000004d', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-00000000004d', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-00000000004d', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-00000000004d', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-00000000004d', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-00000000004e', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-00000000004e', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-00000000004e', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-00000000004e', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-00000000004e', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-00000000004e', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-00000000004f', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-00000000004f', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-00000000004f', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-00000000004f', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-00000000004f', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-00000000004f', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000050', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000050', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000050', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000050', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000050', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000050', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000051', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000051', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000051', 'd0000000-0000-4000-8000-000000000007', false),
  ('10000000-0000-4000-8000-000000000051', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000051', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000051', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000052', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000052', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000052', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000052', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000052', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000052', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000053', 'd0000000-0000-4000-8000-000000000005', false),
  ('10000000-0000-4000-8000-000000000053', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000053', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000053', 'd0000000-0000-4000-8000-000000000008', false),
  ('10000000-0000-4000-8000-000000000053', 'd0000000-0000-4000-8000-000000000009', false),
  ('10000000-0000-4000-8000-000000000053', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000054', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000054', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000054', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000054', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000054', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000054', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000055', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000055', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000055', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000055', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000055', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000055', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000056', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000056', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000056', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000056', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000056', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000056', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000057', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000057', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000057', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000057', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000057', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000057', 'd0000000-0000-4000-8000-00000000000a', false),
  ('10000000-0000-4000-8000-000000000058', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000058', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000058', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-000000000058', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000058', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000058', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-000000000059', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-000000000059', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-000000000059', 'd0000000-0000-4000-8000-000000000007', false),
  ('10000000-0000-4000-8000-000000000059', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-000000000059', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-000000000059', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-00000000005a', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-00000000005a', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-00000000005a', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-00000000005a', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-00000000005a', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-00000000005a', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-00000000005b', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-00000000005b', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-00000000005b', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-00000000005b', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-00000000005b', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-00000000005b', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-00000000005c', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-00000000005c', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-00000000005c', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-00000000005c', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-00000000005c', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-00000000005c', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-00000000005d', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-00000000005d', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-00000000005d', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-00000000005d', 'd0000000-0000-4000-8000-000000000008', true),
  ('10000000-0000-4000-8000-00000000005d', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-00000000005d', 'd0000000-0000-4000-8000-00000000000a', true),
  ('10000000-0000-4000-8000-00000000005e', 'd0000000-0000-4000-8000-000000000005', true),
  ('10000000-0000-4000-8000-00000000005e', 'd0000000-0000-4000-8000-000000000006', true),
  ('10000000-0000-4000-8000-00000000005e', 'd0000000-0000-4000-8000-000000000007', true),
  ('10000000-0000-4000-8000-00000000005e', 'd0000000-0000-4000-8000-000000000008', false),
  ('10000000-0000-4000-8000-00000000005e', 'd0000000-0000-4000-8000-000000000009', true),
  ('10000000-0000-4000-8000-00000000005e', 'd0000000-0000-4000-8000-00000000000a', true);

insert into trade_tags (trade_id, tag_id) values
  ('10000000-0000-4000-8000-000000000027', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-000000000027', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-000000000028', 'e0000000-0000-4000-8000-00000000000d'),
  ('10000000-0000-4000-8000-000000000028', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000028', 'e0000000-0000-4000-8000-000000000017'),
  ('10000000-0000-4000-8000-000000000029', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000029', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-00000000002a', 'e0000000-0000-4000-8000-00000000000d'),
  ('10000000-0000-4000-8000-00000000002a', 'e0000000-0000-4000-8000-00000000001b'),
  ('10000000-0000-4000-8000-00000000002a', 'e0000000-0000-4000-8000-000000000017'),
  ('10000000-0000-4000-8000-00000000002b', 'e0000000-0000-4000-8000-00000000000c'),
  ('10000000-0000-4000-8000-00000000002b', 'e0000000-0000-4000-8000-00000000001b'),
  ('10000000-0000-4000-8000-00000000002b', 'e0000000-0000-4000-8000-000000000014'),
  ('10000000-0000-4000-8000-00000000002c', 'e0000000-0000-4000-8000-000000000011'),
  ('10000000-0000-4000-8000-00000000002c', 'e0000000-0000-4000-8000-00000000000f'),
  ('10000000-0000-4000-8000-00000000002c', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-00000000002c', 'e0000000-0000-4000-8000-000000000017'),
  ('10000000-0000-4000-8000-00000000002d', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-00000000002d', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-00000000002e', 'e0000000-0000-4000-8000-00000000000b'),
  ('10000000-0000-4000-8000-00000000002e', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-00000000002e', 'e0000000-0000-4000-8000-000000000017'),
  ('10000000-0000-4000-8000-00000000002f', 'e0000000-0000-4000-8000-00000000000d'),
  ('10000000-0000-4000-8000-00000000002f', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-00000000002f', 'e0000000-0000-4000-8000-000000000015'),
  ('10000000-0000-4000-8000-000000000030', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000030', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000031', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000031', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-000000000032', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-000000000032', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000033', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000033', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-000000000034', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-000000000034', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000035', 'e0000000-0000-4000-8000-00000000000b'),
  ('10000000-0000-4000-8000-000000000035', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-000000000035', 'e0000000-0000-4000-8000-000000000017'),
  ('10000000-0000-4000-8000-000000000036', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-000000000036', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-000000000037', 'e0000000-0000-4000-8000-000000000011'),
  ('10000000-0000-4000-8000-000000000037', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-000000000037', 'e0000000-0000-4000-8000-000000000015'),
  ('10000000-0000-4000-8000-000000000038', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000038', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000039', 'e0000000-0000-4000-8000-000000000011'),
  ('10000000-0000-4000-8000-000000000039', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-000000000039', 'e0000000-0000-4000-8000-000000000015'),
  ('10000000-0000-4000-8000-00000000003a', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-00000000003a', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-00000000003b', 'e0000000-0000-4000-8000-00000000000e'),
  ('10000000-0000-4000-8000-00000000003b', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-00000000003b', 'e0000000-0000-4000-8000-000000000014'),
  ('10000000-0000-4000-8000-00000000003c', 'e0000000-0000-4000-8000-000000000011'),
  ('10000000-0000-4000-8000-00000000003c', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-00000000003c', 'e0000000-0000-4000-8000-000000000014'),
  ('10000000-0000-4000-8000-00000000003d', 'e0000000-0000-4000-8000-00000000000f'),
  ('10000000-0000-4000-8000-00000000003d', 'e0000000-0000-4000-8000-00000000000c'),
  ('10000000-0000-4000-8000-00000000003d', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-00000000003d', 'e0000000-0000-4000-8000-000000000017'),
  ('10000000-0000-4000-8000-00000000003e', 'e0000000-0000-4000-8000-000000000010'),
  ('10000000-0000-4000-8000-00000000003e', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-00000000003e', 'e0000000-0000-4000-8000-000000000014'),
  ('10000000-0000-4000-8000-00000000003f', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-00000000003f', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000040', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000040', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-000000000041', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-000000000041', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000042', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-000000000042', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000043', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-000000000043', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000044', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000044', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000045', 'e0000000-0000-4000-8000-00000000001b'),
  ('10000000-0000-4000-8000-000000000045', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-000000000046', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-000000000046', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-000000000047', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-000000000047', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000048', 'e0000000-0000-4000-8000-000000000010'),
  ('10000000-0000-4000-8000-000000000048', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-000000000048', 'e0000000-0000-4000-8000-000000000015'),
  ('10000000-0000-4000-8000-000000000049', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-000000000049', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-00000000004a', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-00000000004a', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-00000000004b', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-00000000004b', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-00000000004c', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-00000000004c', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-00000000004d', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-00000000004d', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-00000000004e', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-00000000004e', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-00000000004f', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-00000000004f', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-000000000050', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-000000000050', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000051', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-000000000051', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-000000000052', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000052', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-000000000053', 'e0000000-0000-4000-8000-00000000000d'),
  ('10000000-0000-4000-8000-000000000053', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-000000000053', 'e0000000-0000-4000-8000-000000000015'),
  ('10000000-0000-4000-8000-000000000054', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000054', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000055', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-000000000055', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000056', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000056', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-000000000057', 'e0000000-0000-4000-8000-000000000010'),
  ('10000000-0000-4000-8000-000000000057', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000057', 'e0000000-0000-4000-8000-000000000017'),
  ('10000000-0000-4000-8000-000000000058', 'e0000000-0000-4000-8000-00000000001b'),
  ('10000000-0000-4000-8000-000000000058', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000059', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-000000000059', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-00000000005a', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-00000000005a', 'e0000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-00000000005b', 'e0000000-0000-4000-8000-00000000001b'),
  ('10000000-0000-4000-8000-00000000005b', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-00000000005c', 'e0000000-0000-4000-8000-00000000001a'),
  ('10000000-0000-4000-8000-00000000005c', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-00000000005d', 'e0000000-0000-4000-8000-000000000019'),
  ('10000000-0000-4000-8000-00000000005d', 'e0000000-0000-4000-8000-000000000013'),
  ('10000000-0000-4000-8000-00000000005e', 'e0000000-0000-4000-8000-000000000018'),
  ('10000000-0000-4000-8000-00000000005e', 'e0000000-0000-4000-8000-000000000013');

insert into market_reports (type, title, summary, content_md, report_date, btc_bias, eth_bias, watchlist, is_read, source, idempotency_key, created_at) values
  ('daily', 'Informe diari · BTC alcista', 'BTC per sobre de la MA50 de 1H; ETH acompanya.', '## Resum del mercat
El mercat crypto obre amb to positiu. La dominància de BTC es manté estable i els altcoins segueixen el moviment de BTC sense força pròpia.

## BTC/USDT
- **Biaix 1H:** 🟢 alcista
- **Preu:** ~91.800 · **MA50 (1H):** 91.066 (preu per sobre)
- **Suports:** 90.423 · 89.046
- **Resistències:** 92.902 · 94.095

## ETH/USDT
- **Biaix 1H:** 🟢 alcista
- **Preu:** ~3.120 · relació amb la MA50: rebot net a la mitjana
- **Nivells:** suport 3.058, resistència 3.182

## Notícies i esdeveniments
- Discurs de la Fed a les 20:00.
- Volum baix per festiu als EUA.

## Pla per avui
1. Operar només en la direcció del biaix (llargs).
2. No operar 15 minuts abans ni després de les notícies.
3. Respectar el límit: màxim 4 operacions i 9 € de pèrdua.

## Actius a vigilar
SOL/USDT (aguantant la MA50 de 1H), ETH/USDT.', (now() - interval '6 days')::date, 'bullish', 'bullish', array['BTC/USDT','ETH/USDT','SOL/USDT']::text[], true, 'scheduled', 'seed-daily-6', now() - interval '8820 minutes'),
  ('daily', 'Informe diari · BTC alcista', 'BTC per sobre de la MA50 de 1H; ETH sense direcció.', '## Resum del mercat
El mercat crypto obre amb to positiu. La dominància de BTC es manté estable i els altcoins segueixen el moviment de BTC sense força pròpia.

## BTC/USDT
- **Biaix 1H:** 🟢 alcista
- **Preu:** ~92.167 · **MA50 (1H):** 91.430 (preu per sobre)
- **Suports:** 90.784 · 89.402
- **Resistències:** 93.273 · 94.471

## ETH/USDT
- **Biaix 1H:** ⚪ neutral
- **Preu:** ~3.129 · relació amb la MA50: creuant-la amunt i avall
- **Nivells:** suport 3.066, resistència 3.192

## Notícies i esdeveniments
- Dades d''inflació dels EUA a les 14:30 (hora de Madrid): esperar volatilitat.
- Volum baix per festiu als EUA.

## Pla per avui
1. Operar només en la direcció del biaix (llargs).
2. No operar 15 minuts abans ni després de les notícies.
3. Respectar el límit: màxim 4 operacions i 9 € de pèrdua.

## Actius a vigilar
SOL/USDT (aguantant la MA50 de 1H), ETH/USDT.', (now() - interval '5 days')::date, 'bullish', 'neutral', array['BTC/USDT','ETH/USDT','SOL/USDT']::text[], true, 'scheduled', 'seed-daily-5', now() - interval '7380 minutes'),
  ('daily', 'Informe diari · BTC neutral', 'BTC al voltant de la MA50 de 1H; ETH acompanya.', '## Resum del mercat
El mercat crypto obre sense direcció clara. La dominància de BTC es manté estable i els altcoins segueixen el moviment de BTC sense força pròpia.

## BTC/USDT
- **Biaix 1H:** ⚪ neutral
- **Preu:** ~92.534 · **MA50 (1H):** 93.089 (preu enganxat)
- **Suports:** 91.146 · 89.758
- **Resistències:** 93.644 · 94.847

## ETH/USDT
- **Biaix 1H:** 🟢 alcista
- **Preu:** ~3.139 · relació amb la MA50: rebot net a la mitjana
- **Nivells:** suport 3.076, resistència 3.202

## Notícies i esdeveniments
- Discurs de la Fed a les 20:00.
- Volum baix per festiu als EUA.

## Pla per avui
1. Operar només si BTC surt del rang amb un retest clar.
2. No operar 15 minuts abans ni després de les notícies.
3. Respectar el límit: màxim 4 operacions i 9 € de pèrdua.

## Actius a vigilar
SOL/USDT (aguantant la MA50 de 1H), ETH/USDT.', (now() - interval '4 days')::date, 'neutral', 'bullish', array['BTC/USDT','ETH/USDT','SOL/USDT']::text[], true, 'scheduled', 'seed-daily-4', now() - interval '5940 minutes'),
  ('daily', 'Informe diari · BTC alcista', 'BTC per sobre de la MA50 de 1H; ETH sense direcció.', '## Resum del mercat
El mercat crypto obre amb to positiu. La dominància de BTC es manté estable i els altcoins segueixen el moviment de BTC sense força pròpia.

## BTC/USDT
- **Biaix 1H:** 🟢 alcista
- **Preu:** ~92.902 · **MA50 (1H):** 92.159 (preu per sobre)
- **Suports:** 91.508 · 90.115
- **Resistències:** 94.017 · 95.225

## ETH/USDT
- **Biaix 1H:** ⚪ neutral
- **Preu:** ~3.148 · relació amb la MA50: creuant-la amunt i avall
- **Nivells:** suport 3.085, resistència 3.211

## Notícies i esdeveniments
- Venciment d''opcions de BTC divendres.
- Actualització de xarxa d''Ethereum programada.

## Pla per avui
1. Operar només en la direcció del biaix (llargs).
2. No operar 15 minuts abans ni després de les notícies.
3. Respectar el límit: màxim 4 operacions i 9 € de pèrdua.

## Actius a vigilar
SOL/USDT (aguantant la MA50 de 1H), ETH/USDT.', (now() - interval '3 days')::date, 'bullish', 'neutral', array['BTC/USDT','ETH/USDT','SOL/USDT']::text[], true, 'scheduled', 'seed-daily-3', now() - interval '4500 minutes'),
  ('daily', 'Informe diari · BTC alcista', 'BTC per sobre de la MA50 de 1H; ETH acompanya.', '## Resum del mercat
El mercat crypto obre amb to positiu. La dominància de BTC es manté estable i els altcoins segueixen el moviment de BTC sense força pròpia.

## BTC/USDT
- **Biaix 1H:** 🟢 alcista
- **Preu:** ~93.269 · **MA50 (1H):** 92.523 (preu per sobre)
- **Suports:** 91.870 · 90.471
- **Resistències:** 94.388 · 95.601

## ETH/USDT
- **Biaix 1H:** 🟢 alcista
- **Preu:** ~3.157 · relació amb la MA50: rebot net a la mitjana
- **Nivells:** suport 3.094, resistència 3.220

## Notícies i esdeveniments
- Fluxos positius als ETF de BTC ahir.
- Cap esdeveniment macro important avui.

## Pla per avui
1. Operar només en la direcció del biaix (llargs).
2. No operar 15 minuts abans ni després de les notícies.
3. Respectar el límit: màxim 4 operacions i 9 € de pèrdua.

## Actius a vigilar
SOL/USDT (aguantant la MA50 de 1H), ETH/USDT.', (now() - interval '2 days')::date, 'bullish', 'bullish', array['BTC/USDT','ETH/USDT','SOL/USDT']::text[], true, 'scheduled', 'seed-daily-2', now() - interval '3060 minutes'),
  ('daily', 'Informe diari · BTC neutral', 'BTC al voltant de la MA50 de 1H; ETH sense direcció.', '## Resum del mercat
El mercat crypto obre sense direcció clara. La dominància de BTC es manté estable i els altcoins segueixen el moviment de BTC sense força pròpia.

## BTC/USDT
- **Biaix 1H:** ⚪ neutral
- **Preu:** ~93.636 · **MA50 (1H):** 94.198 (preu enganxat)
- **Suports:** 92.231 · 90.827
- **Resistències:** 94.760 · 95.977

## ETH/USDT
- **Biaix 1H:** ⚪ neutral
- **Preu:** ~3.167 · relació amb la MA50: creuant-la amunt i avall
- **Nivells:** suport 3.104, resistència 3.230

## Notícies i esdeveniments
- Fluxos positius als ETF de BTC ahir.
- Volum baix per festiu als EUA.

## Pla per avui
1. Operar només si BTC surt del rang amb un retest clar.
2. No operar 15 minuts abans ni després de les notícies.
3. Respectar el límit: màxim 4 operacions i 9 € de pèrdua.

## Actius a vigilar
SOL/USDT (aguantant la MA50 de 1H), ETH/USDT.', (now() - interval '1 days')::date, 'neutral', 'neutral', array['BTC/USDT','ETH/USDT','SOL/USDT']::text[], false, 'scheduled', 'seed-daily-1', now() - interval '1620 minutes'),
  ('daily', 'Informe diari · BTC baixista', 'BTC per sota de la MA50 de 1H; ETH acompanya.', '## Resum del mercat
El mercat crypto obre amb pressió venedora. La dominància de BTC es manté estable i els altcoins segueixen el moviment de BTC sense força pròpia.

## BTC/USDT
- **Biaix 1H:** 🔴 baixista
- **Preu:** ~94.003 · **MA50 (1H):** 94.567 (preu per sota)
- **Suports:** 92.593 · 91.183
- **Resistències:** 95.131 · 96.353

## ETH/USDT
- **Biaix 1H:** 🟢 alcista
- **Preu:** ~3.176 · relació amb la MA50: rebot net a la mitjana
- **Nivells:** suport 3.112, resistència 3.240

## Notícies i esdeveniments
- Discurs de la Fed a les 20:00.
- Cap esdeveniment macro important avui.

## Pla per avui
1. Operar només en la direcció del biaix (curts).
2. No operar 15 minuts abans ni després de les notícies.
3. Respectar el límit: màxim 4 operacions i 9 € de pèrdua.

## Actius a vigilar
SOL/USDT (aguantant la MA50 de 1H), ETH/USDT.', (now() - interval '0 days')::date, 'bearish', 'bullish', array['BTC/USDT','ETH/USDT','SOL/USDT']::text[], false, 'scheduled', 'seed-daily-0', now() - interval '180 minutes'),
  ('weekly', 'Informe setmanal · tendència alcista intacta', 'BTC respecta la MA50 de 1H; setmana per buscar llargs.', '## Setmana en resum
Setmana alcista per a BTC, que ha respectat la MA50 de 1H a tots els retrocessos.

## Nivells setmanals
| Actiu | Suport | Resistència | MA50 (1H) |
|---|---|---|---|
| BTC | 88.128 | 95.472 | per sobre |
| ETH | 2.964 | 3.276 | a prop |
| SOL | 132.1 | 151.9 | per sobre |

## Calendari de la setmana
- Dimarts: actes de la Fed
- Dijous: dades d''ocupació dels EUA
- Divendres: venciment d''opcions

## Pla per a la setmana
- Prioritat: **BTC i ETH** en la direcció del biaix de 1H.
- Revisar dissabte el diari d''operacions i actualitzar el playbook si cal.', (date_trunc('week', now()) - interval '1 weeks')::date, 'bullish', 'neutral', array['BTC/USDT','ETH/USDT','SOL/USDT']::text[], true, 'scheduled', 'seed-weekly-1', date_trunc('week', now()) - interval '1 weeks' + interval '8 hours'),
  ('weekly', 'Informe setmanal · consolidació', 'Rang ample a BTC; paciència i menys operacions.', '## Setmana en resum
Setmana de consolidació: BTC ha fet un rang ample i les altcoins han perdut força relativa.

## Nivells setmanals
| Actiu | Suport | Resistència | MA50 (1H) |
|---|---|---|---|
| BTC | 88.128 | 95.472 | per sobre |
| ETH | 2.964 | 3.276 | a prop |
| SOL | 132.1 | 151.9 | per sobre |

## Calendari de la setmana
- Dimarts: actes de la Fed
- Dijous: dades d''ocupació dels EUA
- Divendres: venciment d''opcions

## Pla per a la setmana
- Prioritat: **BTC i ETH** en la direcció del biaix de 1H.
- Revisar dissabte el diari d''operacions i actualitzar el playbook si cal.', (date_trunc('week', now()) - interval '0 weeks')::date, 'neutral', 'neutral', array['BTC/USDT','ETH/USDT','SOL/USDT']::text[], false, 'scheduled', 'seed-weekly-0', date_trunc('week', now()) - interval '0 weeks' + interval '8 hours');

insert into media (entity_type, entity_id, kind, url, thumb_url, mime_type, width, height, caption, sort_order, created_at) values
  ('analysis', 'f0000000-0000-4000-8000-00000000001c', 'analysis', '/seed/analysis_1.webp', '/seed/analysis_1_thumb.webp', 'image/webp', 1280, 720, 'BTC/USDT 1H', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '34 days' + interval '542 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('analysis', 'f0000000-0000-4000-8000-00000000001d', 'analysis', '/seed/analysis_2.webp', '/seed/analysis_2_thumb.webp', 'image/webp', 1280, 720, 'ETH/USDT 1H', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '30 days' + interval '483 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('analysis', 'f0000000-0000-4000-8000-00000000001e', 'analysis', '/seed/analysis_3.webp', '/seed/analysis_3_thumb.webp', 'image/webp', 1280, 720, 'SOL/USDT 1H', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '497 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('analysis', 'f0000000-0000-4000-8000-00000000001f', 'analysis', '/seed/analysis_4.webp', '/seed/analysis_4_thumb.webp', 'image/webp', 1280, 720, 'BTC/USDT 1H', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '22 days' + interval '491 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('analysis', 'f0000000-0000-4000-8000-000000000020', 'analysis', '/seed/analysis_5.webp', '/seed/analysis_5_thumb.webp', 'image/webp', 1280, 720, 'ETH/USDT 1H', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '17 days' + interval '537 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('analysis', 'f0000000-0000-4000-8000-000000000021', 'analysis', '/seed/analysis_6.webp', '/seed/analysis_6_thumb.webp', 'image/webp', 1280, 720, 'BTC/USDT 1H', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '13 days' + interval '514 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('analysis', 'f0000000-0000-4000-8000-000000000022', 'analysis', '/seed/analysis_7.webp', '/seed/analysis_7_thumb.webp', 'image/webp', 1280, 720, 'SOL/USDT 1H', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '9 days' + interval '503 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('analysis', 'f0000000-0000-4000-8000-000000000023', 'analysis', '/seed/analysis_8.webp', '/seed/analysis_8_thumb.webp', 'image/webp', 1280, 720, 'BTC/USDT 1H', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '547 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('analysis', 'f0000000-0000-4000-8000-000000000024', 'analysis', '/seed/analysis_9.webp', '/seed/analysis_9_thumb.webp', 'image/webp', 1280, 720, 'ETH/USDT 1H', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '3 days' + interval '536 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('analysis', 'f0000000-0000-4000-8000-000000000025', 'analysis', '/seed/analysis_10.webp', '/seed/analysis_10_thumb.webp', 'image/webp', 1280, 720, 'BTC/USDT 1H', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '1 days' + interval '550 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('analysis', 'f0000000-0000-4000-8000-000000000026', 'analysis', '/seed/analysis_11.webp', '/seed/analysis_11_thumb.webp', 'image/webp', 1280, 720, 'SOL/USDT 1H', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '0 days' + interval '543 minutes') at time zone 'Europe/Madrid', now() - interval '30 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000002a', 'before', '/seed/trade_4_before.webp', '/seed/trade_4_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '40 days' + interval '998 minutes') at time zone 'Europe/Madrid', now() - interval '137 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000002a', 'after', '/seed/trade_4_after.webp', '/seed/trade_4_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '40 days' + interval '1041 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000002e', 'before', '/seed/trade_8_before.webp', '/seed/trade_8_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '36 days' + interval '732 minutes') at time zone 'Europe/Madrid', now() - interval '135 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000002e', 'after', '/seed/trade_8_after.webp', '/seed/trade_8_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '36 days' + interval '772 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes')),
  ('trade', '10000000-0000-4000-8000-000000000032', 'before', '/seed/trade_12_before.webp', '/seed/trade_12_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '31 days' + interval '579 minutes') at time zone 'Europe/Madrid', now() - interval '201 minutes')),
  ('trade', '10000000-0000-4000-8000-000000000032', 'after', '/seed/trade_12_after.webp', '/seed/trade_12_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '31 days' + interval '594 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes')),
  ('trade', '10000000-0000-4000-8000-000000000036', 'before', '/seed/trade_16_before.webp', '/seed/trade_16_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '29 days' + interval '795 minutes') at time zone 'Europe/Madrid', now() - interval '207 minutes')),
  ('trade', '10000000-0000-4000-8000-000000000036', 'after', '/seed/trade_16_after.webp', '/seed/trade_16_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '29 days' + interval '817 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000003a', 'before', '/seed/trade_20_before.webp', '/seed/trade_20_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '816 minutes') at time zone 'Europe/Madrid', now() - interval '142 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000003a', 'after', '/seed/trade_20_after.webp', '/seed/trade_20_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '26 days' + interval '863 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000003e', 'before', '/seed/trade_24_before.webp', '/seed/trade_24_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '23 days' + interval '593 minutes') at time zone 'Europe/Madrid', now() - interval '330 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000003e', 'after', '/seed/trade_24_after.webp', '/seed/trade_24_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '23 days' + interval '649 minutes') at time zone 'Europe/Madrid', now() - interval '185 minutes')),
  ('trade', '10000000-0000-4000-8000-000000000042', 'before', '/seed/trade_28_before.webp', '/seed/trade_28_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '20 days' + interval '635 minutes') at time zone 'Europe/Madrid', now() - interval '126 minutes')),
  ('trade', '10000000-0000-4000-8000-000000000042', 'after', '/seed/trade_28_after.webp', '/seed/trade_28_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '20 days' + interval '666 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes')),
  ('trade', '10000000-0000-4000-8000-000000000046', 'before', '/seed/trade_32_before.webp', '/seed/trade_32_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '16 days' + interval '656 minutes') at time zone 'Europe/Madrid', now() - interval '111 minutes')),
  ('trade', '10000000-0000-4000-8000-000000000046', 'after', '/seed/trade_32_after.webp', '/seed/trade_32_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '16 days' + interval '671 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000004a', 'before', '/seed/trade_36_before.webp', '/seed/trade_36_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '13 days' + interval '591 minutes') at time zone 'Europe/Madrid', now() - interval '158 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000004a', 'after', '/seed/trade_36_after.webp', '/seed/trade_36_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '13 days' + interval '654 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000004e', 'before', '/seed/trade_40_before.webp', '/seed/trade_40_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '9 days' + interval '595 minutes') at time zone 'Europe/Madrid', now() - interval '134 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000004e', 'after', '/seed/trade_40_after.webp', '/seed/trade_40_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '9 days' + interval '635 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes')),
  ('trade', '10000000-0000-4000-8000-000000000052', 'before', '/seed/trade_44_before.webp', '/seed/trade_44_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '729 minutes') at time zone 'Europe/Madrid', now() - interval '138 minutes')),
  ('trade', '10000000-0000-4000-8000-000000000052', 'after', '/seed/trade_44_after.webp', '/seed/trade_44_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '6 days' + interval '772 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes')),
  ('trade', '10000000-0000-4000-8000-000000000056', 'before', '/seed/trade_48_before.webp', '/seed/trade_48_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '4 days' + interval '571 minutes') at time zone 'Europe/Madrid', now() - interval '248 minutes')),
  ('trade', '10000000-0000-4000-8000-000000000056', 'after', '/seed/trade_48_after.webp', '/seed/trade_48_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '4 days' + interval '633 minutes') at time zone 'Europe/Madrid', now() - interval '95 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000005a', 'before', '/seed/trade_52_before.webp', '/seed/trade_52_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '2 days' + interval '804 minutes') at time zone 'Europe/Madrid', now() - interval '167 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000005a', 'after', '/seed/trade_52_after.webp', '/seed/trade_52_after_thumb.webp', 'image/webp', 1280, 720, 'Resultat', 1, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '2 days' + interval '877 minutes') at time zone 'Europe/Madrid', now() - interval '5 minutes')),
  ('trade', '10000000-0000-4000-8000-00000000005e', 'before', '/seed/trade_56_before.webp', '/seed/trade_56_before_thumb.webp', 'image/webp', 1280, 720, 'Pla a 5m', 0, least((date_trunc('day', now() at time zone 'Europe/Madrid') - interval '0 days' + interval '651 minutes') at time zone 'Europe/Madrid', now() - interval '143 minutes'));

insert into concepts (id, slug, title, category, summary, content_md, status, sort_order) values
  ('20000000-0000-4000-8000-000000000061', 'estructura-de-mercat', 'Estructura de mercat', 'Fonaments', 'Màxims i mínims: com es defineix una tendència.', 'Una **tendència alcista** fa màxims i mínims creixents (HH/HL). Una **baixista**, màxims i mínims decreixents (LH/LL).

- **BOS (break of structure):** el preu supera el darrer màxim (alcista) o mínim (baixista) → la tendència continua.
- **CHoCH (change of character):** primer trencament en contra → possible canvi de tendència.

**A la meva estratègia:** l''estructura es llegeix a **5m** per confirmar el biaix de 1H.', 'learning', 1),
  ('20000000-0000-4000-8000-000000000062', 'suports-i-resistencies', 'Suports i resistències', 'Fonaments', 'Zones on el preu ha reaccionat abans.', 'Un **suport** és una zona on la demanda ha frenat caigudes; una **resistència**, on l''oferta ha frenat pujades.

- Pensa en **zones**, no en línies exactes.
- Com més vegades es toca un nivell, més probable és que acabi trencant.
- Un suport trencat sovint es converteix en resistència (*flip*).', 'learning', 2),
  ('20000000-0000-4000-8000-000000000063', 'tendencia', 'Tendència', 'Fonaments', 'Operar a favor del corrent principal.', 'La tendència és la direcció dominant del preu en una temporalitat. **A favor de tendència** la probabilitat és més alta i els moviments, més llargs.

A la meva estratègia la tendència de referència és la de **1H**, definida per la posició del preu respecte a la MA50 i el pendent de la mitjana.', 'mastered', 3),
  ('20000000-0000-4000-8000-000000000064', 'impulsos-i-retrocessos', 'Impulsos i retrocessos', 'Fonaments', 'El ritme del preu: moviments forts i correccions.', 'En tendència, el preu alterna **impulsos** (espelmes grans a favor) i **retrocessos** (correccions més lentes i petites).

- Entrar **al final del retrocés** dona un SL més ajustat i un millor R:R.
- Entrar **en ple impuls** és la causa típica de *FOMO* i d''SL massa lluny.
- Retrocessos habituals: 38–62 % de l''impuls o tornada a la MA50.', 'learning', 4),
  ('20000000-0000-4000-8000-000000000065', 'ma50', 'Mitjana mòbil de 50 (MA50)', 'Indicadors', 'L''únic indicador de la meva estratègia.', 'La **MA50** és la mitjana del preu de tancament de les darreres 50 espelmes.

| Situació | Lectura |
|---|---|
| Preu per sobre i MA amb pendent amunt | Biaix alcista → només llargs |
| Preu per sota i MA amb pendent avall | Biaix baixista → només curts |
| Preu creuant-la i MA plana | Sense biaix → no operar |

Als retrocessos, la MA50 sovint actua com a **suport/resistència dinàmica**.', 'learning', 5),
  ('20000000-0000-4000-8000-000000000066', 'temporalitats-multiples', 'Anàlisi multitemporal', 'Estratègia', '1H biaix → 5m estructura → 1m execució.', 'Cada temporalitat té una funció:
1. **1H — biaix:** cap a on és més probable que vagi el preu.
2. **5m — confirmació:** l''estructura s''alinea amb el biaix.
3. **1m — execució:** gatell precís i SL ajustat.

Regla d''or: **la temporalitat menor mai contradiu la major**.', 'learning', 6),
  ('20000000-0000-4000-8000-000000000067', 'gestio-del-risc', 'Gestió del risc', 'Risc', 'Mida de posició, R i límits.', '- **1R** = el que perds si toca l''SL.
- **Mida de posició** = (capital × risc %) / distància a l''SL.
- Amb un **R:R 1:2** i un win rate del 40 % ja ets rendible: 0,4 × 2 − 0,6 × 1 = **+0,2R** per operació.
- El palanquejament **no canvia el risc** si la mida es calcula amb l''SL; només canvia el marge.', 'mastered', 7),
  ('20000000-0000-4000-8000-000000000068', 'psicologia', 'Psicologia del trading', 'Psicologia', 'FOMO, revenja i disciplina.', 'Els errors més cars no són tècnics:
- **FOMO:** entrar tard perquè “se n''anirà sense mi”.
- **Revenja:** obrir una operació per recuperar una pèrdua.
- **Moure l''SL:** convertir -1R en -2R.

Eina: la **checklist** abans de cada entrada i el **límit diari**.', 'pending', 8),
  ('20000000-0000-4000-8000-000000000069', 'rr-i-esperanca', 'R:R i esperança matemàtica', 'Risc', 'Per què el win rate sol no diu res.', '**Esperança** = (win rate × guany mitjà) − (loss rate × pèrdua mitjana).

Exemple: 45 % d''encerts a 2R → 0,45 × 2 − 0,55 × 1 = **+0,35R** per operació.', 'pending', 9);

insert into concept_examples (concept_id, analysis_id, note) values
  ('20000000-0000-4000-8000-000000000065', 'f0000000-0000-4000-8000-00000000001c', 'Preu per sobre de la MA50 de 1H amb pendent positiu.'),
  ('20000000-0000-4000-8000-000000000065', 'f0000000-0000-4000-8000-00000000001f', 'MA50 plana: sense biaix, no operar.'),
  ('20000000-0000-4000-8000-000000000061', 'f0000000-0000-4000-8000-000000000020', 'Mínims creixents a 5m.'),
  ('20000000-0000-4000-8000-000000000063', 'f0000000-0000-4000-8000-000000000021', 'Tendència baixista: màxims decreixents.'),
  ('20000000-0000-4000-8000-000000000062', 'f0000000-0000-4000-8000-00000000001e', 'Suport respectat dues vegades.'),
  ('20000000-0000-4000-8000-000000000064', 'f0000000-0000-4000-8000-000000000023', 'Impuls + retrocés a la MA50.');

insert into goals (title, kind, target, manual_progress, starts_on, deadline) values
  ('Tancar el mes amb una operació guanyadora', 'winning_trades', 1, 0, date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date),
  ('30 dies registrant sense fallar', 'journal_streak', 30, 0, (now() - interval '10 days')::date, (now() + interval '20 days')::date),
  ('Win rate ≥ 50 % aquest mes', 'win_rate', 50, 0, date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date),
  ('Llegir 5 conceptes del playbook', 'custom', 5, 2, (now() - interval '15 days')::date, (now() + interval '15 days')::date);

commit;


notify pgrst, 'reload schema';
