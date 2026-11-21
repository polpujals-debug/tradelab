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
