-- TradeLab · comprova si l'estructura està completa. Ha de donar: taules 18, vistes 5, bucket 1.
select
  (select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'
     and table_name in ('accounts','assets','strategies','strategy_rules','analyses','trades','trade_rule_checks','tags','trade_tags',
       'market_reports','concepts','concept_examples','media','goals','practice_attempts','settings','api_keys','idempotency_keys')) as taules,
  (select count(*) from information_schema.views where table_schema = 'public' and table_name like 'v\_%') as vistes,
  (select count(*) from storage.buckets where id = 'media') as bucket;
