-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ TradeLab · COLUMNES-SOBRANTS                                       ║
-- ║ Fa opcionals les columnes obligatòries que sobren a les taules de  ║
-- ║ TradeLab (p. ex. api_keys.user_id). No esborra res.                ║
-- ║ Obre'l amb el Bloc de notes (no amb el navegador) i desactiva la   ║
-- ║ traducció de Supabase abans d'enganxar-lo.                         ║
-- ╚══════════════════════════════════════════════════════════════════╝
do $$
begin
  if 'scheduled' <> ('sched' || 'uled') or 'sort_order' <> ('sort' || '_' || 'order') then
    raise exception 'ATURAT: el text s''ha traduït automàticament. Obre el fitxer amb el Bloc de notes i desactiva la traducció del navegador.';
  end if;
end $$;

-- ── Columnes que sobren (no són de TradeLab) i són obligatòries → es fan opcionals ──
do $$
declare r record; c record;
begin
  for r in select * from (values
    ('accounts', array['id','name','type','initial_capital','currency','is_default','created_at','updated_at']::text[]),
    ('analyses', array['id','asset_id','title','timeframes','bias','levels','content_md','scenario','outcome','review_at','reviewed_at','my_notes','questions','source','analyzed_at','created_at','updated_at']::text[]),
    ('api_keys', array['id','name','prefix','key_hash','last_used_at','revoked_at','created_at','updated_at']::text[]),
    ('assets', array['id','symbol','type','is_favorite','created_at','updated_at']::text[]),
    ('concept_examples', array['id','concept_id','analysis_id','trade_id','note','created_at','updated_at']::text[]),
    ('concepts', array['id','slug','title','category','summary','content_md','status','sort_order','created_at','updated_at']::text[]),
    ('goals', array['id','title','kind','target','manual_progress','starts_on','deadline','achieved_at','created_at','updated_at']::text[]),
    ('idempotency_keys', array['key','scope','request_hash','status_code','response','created_at']::text[]),
    ('market_reports', array['id','type','title','summary','content_md','report_date','btc_bias','eth_bias','watchlist','is_read','source','idempotency_key','created_at','updated_at']::text[]),
    ('media', array['id','entity_type','entity_id','kind','url','thumb_url','storage_path','mime_type','width','height','size_bytes','caption','sort_order','created_at','updated_at']::text[]),
    ('practice_attempts', array['id','analysis_id','trade_id','answer_bias','answer_stop','bias_correct','created_at','updated_at']::text[]),
    ('settings', array['id','default_account_id','currency','default_risk_pct','risk_warning_pct','max_daily_loss','max_weekly_loss','max_trades_per_day','timezone','locale','created_at','updated_at']::text[]),
    ('strategies', array['id','name','version','description_md','timeframes','indicators','is_active','created_at','updated_at']::text[]),
    ('strategy_rules', array['id','strategy_id','text','sort_order','is_required','created_at','updated_at']::text[]),
    ('tags', array['id','name','kind','color','created_at','updated_at']::text[]),
    ('trade_rule_checks', array['trade_id','rule_id','passed','created_at','updated_at']::text[]),
    ('trade_tags', array['trade_id','tag_id','created_at']::text[]),
    ('trades', array['id','account_id','asset_id','strategy_id','analysis_id','direction','status','entry_at','exit_at','entry_price','stop_loss','take_profit','exit_price','quantity','leverage','fees','capital_at_entry','bias_1h','confirmation_5m','trigger_1m','setup','emotion_before','emotion_after','notes','lesson','source','created_at','updated_at']::text[])
  ) as x(taula, cols) loop
    for c in select column_name from information_schema.columns
              where table_schema = 'public' and table_name = r.taula and is_nullable = 'NO'
                and column_default is null and not (column_name = any(r.cols)) loop
      execute format('alter table public.%I alter column %I drop not null', r.taula, c.column_name);
      raise notice 'Columna %.% (no és de TradeLab) ara és opcional', r.taula, c.column_name;
    end loop;
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Resultat: ha de sortir 0
select count(*) as columnes_obligatories_que_sobren
from information_schema.columns ic
where ic.table_schema = 'public' and ic.is_nullable = 'NO' and ic.column_default is null
  and ic.table_name in ('accounts','assets','strategies','strategy_rules','analyses','trades','trade_rule_checks','tags','trade_tags','market_reports','concepts','concept_examples','media','goals','practice_attempts','settings','api_keys','idempotency_keys')
  and ic.column_name not in ('id','name','type','initial_capital','currency','is_default','created_at','updated_at','symbol','is_favorite','version','description_md','timeframes','indicators','is_active','strategy_id','text','sort_order','is_required','asset_id','title','bias','levels','content_md','outcome','source','analyzed_at','account_id','direction','status','entry_price','stop_loss','quantity','leverage','fees','capital_at_entry','trade_id','rule_id','passed','kind','tag_id','report_date','watchlist','is_read','slug','category','concept_id','url','target','manual_progress','starts_on','default_risk_pct','risk_warning_pct','timezone','locale','prefix','key_hash','key','scope','request_hash','status_code','response');
