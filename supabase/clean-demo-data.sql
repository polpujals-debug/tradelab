-- Esborra les DADES D'EXEMPLE del seed i deixa la plataforma a punt per començar de debò.
-- Conserva: comptes, configuració, estratègia (versions i checklist), etiquetes, conceptes i claus d'API.
-- Executa-ho al SQL Editor de Supabase. No es pot desfer.
begin;
delete from media where url like '/seed/%';
delete from concept_examples;
delete from practice_attempts;
delete from trades;            -- també esborra checklist i etiquetes de cada operació (cascade)
delete from analyses;
delete from market_reports;
delete from goals;
delete from idempotency_keys;
-- Capital inicial de referència: 200 €
update accounts set initial_capital = 200 where is_default;
commit;
