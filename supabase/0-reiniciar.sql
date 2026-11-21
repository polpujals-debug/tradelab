-- TradeLab · REINICI: esborra totes les taules, vistes i tipus de TradeLab (i les seves dades).
-- Fes-lo servir només si la instal·lació ha quedat a mitges. Després torna a executar 1-estructura.sql.
-- No toca res de Supabase (usuaris, Storage, etc.).
drop view if exists v_rule_stats, v_tag_stats, v_account_balance, v_daily_pnl, v_trade_metrics cascade;
drop table if exists
  idempotency_keys, api_keys, settings, practice_attempts, goals, media, concept_examples, concepts,
  market_reports, trade_tags, tags, trade_rule_checks, trades, analyses, strategy_rules, strategies,
  assets, accounts cascade;
drop type if exists
  account_type, trade_direction, trade_status, market_bias, analysis_outcome, content_source,
  media_kind, media_entity, tag_kind, report_type, concept_status, goal_kind cascade;
drop function if exists set_updated_at() cascade;
