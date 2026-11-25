/**
 * Construeix supabase/INSTAL·LAR.sql (i DADES-EXEMPLE.sql) a partir de les
 * migracions. Funcions pures: scripts/generate-setup-sql.ts les escriu a disc
 * i scripts/setup-sql.test.ts comprova que els fitxers estan al dia.
 *
 * Cada sentència de les migracions es converteix en una versió idempotent
 * (es pot executar tantes vegades com calgui i sobre una instal·lació a mitges).
 * Si una migració fa servir un patró que no sabem fer idempotent, es llança un
 * error en lloc de generar un fitxer que fallaria la segona vegada.
 */

export const SETUP_FILE = "INSTAL·LAR.sql";
export const DEMO_FILE = "DADES-EXEMPLE.sql";

export interface Migration {
  name: string;
  sql: string;
}

interface Table {
  name: string;
  columns: string[];
}

interface Schema {
  tables: Table[];
  views: string[];
  enums: { name: string; labels: string[] }[];
  indexes: { name: string; table: string }[];
}

const IDENT = String.raw`[a-z_][a-z0-9_]*`;
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const textArray = (items: string[]) => `array[${items.map(lit).join(", ")}]::text[]`;

class SetupSqlError extends Error {}

function fail(migration: string, message: string): never {
  throw new SetupSqlError(`${migration}: ${message}`);
}

/** Treu el prefix d'esquema `public.` d'un identificador. */
const bare = (name: string) => name.replace(/^public\./, "");

/** Columnes declarades dins d'un `create table (...)`. */
function tableColumns(body: string): string[] {
  const columns: string[] = [];
  let depth = 0;
  let current = "";
  const parts: string[] = [];
  let quoted = false;
  for (const ch of body.replace(/--[^\n]*/g, "")) {
    if (ch === "'") quoted = !quoted; // '' (cometa escapada) torna a l'estat inicial
    if (!quoted && ch === "(") depth++;
    if (!quoted && ch === ")") depth--;
    if (!quoted && ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  parts.push(current);
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const first = part.split(/\s+/)[0].toLowerCase();
    if (["constraint", "primary", "unique", "check", "foreign", "exclude", "like"].includes(first)) continue;
    columns.push(first.replace(/"/g, ""));
  }
  return columns;
}

/** Converteix una migració en SQL idempotent i en recull l'esquema. */
function transform(m: Migration, schema: Schema, dropped: Set<string>): string {
  let sql = m.sql.replace(/\r\n/g, "\n");

  // Tipus enumerats → bloc amb guarda duplicate_object
  sql = sql.replace(new RegExp(String.raw`^create type (${IDENT}(?:\.${IDENT})?) as enum \(([\s\S]*?)\);`, "gm"), (_, name: string, labels: string) => {
    const values = [...labels.matchAll(/'((?:[^']|'')*)'/g)].map((x) => x[1].replace(/''/g, "'"));
    schema.enums.push({ name: bare(name), labels: values });
    return `do $$ begin create type ${name} as enum (${labels.trim()}); exception when duplicate_object then null; end $$;`;
  });

  // Taules
  sql = sql.replace(new RegExp(String.raw`^create table (if not exists )?(${IDENT}(?:\.${IDENT})?) \(([\s\S]*?)\n\);`, "gm"), (_, _ine, name: string, body: string) => {
    schema.tables.push({ name: bare(name), columns: tableColumns(body) });
    return `create table if not exists ${name} (${body}\n);`;
  });

  // Índexs
  sql = sql.replace(new RegExp(String.raw`^create (unique )?index (if not exists )?(${IDENT}) on (${IDENT}(?:\.${IDENT})?)`, "gm"), (_, unique = "", _ine, name: string, table: string) => {
    schema.indexes.push({ name, table: bare(table) });
    return `create ${unique}index if not exists ${name} on ${table}`;
  });

  // Vistes: es recreen sempre (abans s'esborren totes, vegeu buildSetupSql)
  sql = sql.replace(new RegExp(String.raw`^create (or replace )?view (${IDENT}(?:\.${IDENT})?)`, "gm"), (_, _orr, name: string) => {
    if (!schema.views.includes(bare(name))) schema.views.push(bare(name));
    return `create or replace view ${name}`;
  });

  // Funcions
  sql = sql.replace(/^create function /gm, "create or replace function ");

  // Columnes noves
  sql = sql.replace(new RegExp(String.raw`^(alter table (?:only )?${IDENT}(?:\.${IDENT})?\s+add column )(?!if not exists )`, "gm"), "$1if not exists ");
  for (const x of sql.matchAll(new RegExp(String.raw`drop column (?:if exists )?(${IDENT})|rename column (${IDENT})`, "g"))) dropped.add(x[1] ?? x[2]);

  // Valors nous d'un enum
  sql = sql.replace(/^(alter type \S+ add value )(?!if not exists )/gm, "$1if not exists ");

  // Triggers dins d'un execute format('create trigger …', …)
  sql = sql.replace(/^(\s*)execute format\('create trigger (\S+) (?:before|after|instead of) [^']*? on (\S+) [^']*'((?:, *[^,)]+)*)\);$/gm, (line, indent: string, name: string, table: string, args: string) => {
    const argList = args.split(",").map((a) => a.trim()).filter(Boolean);
    const used = (name.match(/%I/g)?.length ?? 0) + (table.match(/%I/g)?.length ?? 0);
    if (used !== argList.length) fail(m.name, `no sé fer idempotent el trigger dinàmic: ${line.trim()}`);
    const dropArgs = argList.length ? `, ${argList.join(", ")}` : "";
    return `${indent}execute format('drop trigger if exists ${name} on ${table}'${dropArgs});\n${line}`;
  });

  // Triggers normals
  sql = sql.replace(new RegExp(String.raw`^create trigger (${IDENT})(\s[\s\S]*?\son (${IDENT}(?:\.${IDENT})?)\s)`, "gm"), (_, name: string, rest: string, table: string) => `drop trigger if exists ${name} on ${table};\ncreate trigger ${name}${rest}`);

  // Polítiques RLS
  sql = sql.replace(/^create policy ("[^"]+"|\S+) on (\S+)/gm, (match, name: string, table: string) => `drop policy if exists ${name} on ${table};\n${match}`);

  validate(m.name, sql);
  return sql;
}

/** Comprova que no hi queda cap sentència que falli si s'executa dues vegades. */
function validate(migration: string, sql: string) {
  const lines = sql.split("\n");
  lines.forEach((line, i) => {
    const l = line.trim().toLowerCase();
    if (l.startsWith("--")) return;
    const ok = (re: RegExp) => re.test(l);
    if (l.startsWith("create ")) {
      const allowed =
        ok(/^create table if not exists /) ||
        ok(/^create (unique )?index if not exists /) ||
        ok(/^create or replace (view|function|trigger) /) ||
        ok(/^create (extension|schema|sequence) if not exists /) ||
        (ok(/^create (trigger|policy) /) && /^drop (trigger|policy) if exists /.test(lines[i - 1]?.trim().toLowerCase() ?? ""));
      if (!allowed) fail(migration, `sentència no idempotent a la línia ${i + 1}: ${line.trim()}`);
    }
    if (/^alter table .* add constraint /.test(l)) fail(migration, `"add constraint" no és idempotent (línia ${i + 1}); fes-ho dins d'un bloc do amb una guarda`);
    if (/^alter table .* rename to /.test(l) || /^drop table /.test(l)) fail(migration, `canvi destructiu no suportat a la línia ${i + 1}: ${line.trim()}`);
  });
  for (const ins of sql.matchAll(/^insert into [\s\S]*?;/gm)) {
    if (!/on conflict/i.test(ins[0]) && !/where not exists/i.test(ins[0])) fail(migration, `insert sense "on conflict": ${ins[0].split("\n")[0]}`);
  }
}

/** Bloc que aparta (reanomena a <nom>_antiga) els objectes amb el nom d'un de TradeLab que no ho són. */
function protectBlock(schema: Schema, dropped: Set<string>): string {
  const tables = schema.tables
    .map((t) => `    (${lit(t.name)}, 'taula', ${textArray(t.columns.filter((c) => !dropped.has(c)))})`)
    .concat(schema.views.map((v) => `    (${lit(v)}, 'vista', null::text[])`));
  const enums = schema.enums.map((e) => `    (${lit(e.name)}, ${textArray(e.labels)})`);
  const indexes = schema.indexes.map((x) => `    (${lit(x.name)}, ${lit(x.table)})`);
  return `-- ── Pas 1: aparta el que té el nom d'un objecte de TradeLab però no n'és ──
-- (taules d'una altra aplicació, una taula on hi hauria d'anar una vista…)
-- No s'esborra res: es reanomena a <nom>_antiga.
do $$
declare
  r record;
  k "char";
  nou text;
  falten integer;
begin
  -- Taules i vistes
  for r in select * from (values
${tables.join(",\n")}
  ) as x(nom, tipus, columnes) loop
    select c.relkind into k from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = r.nom;
    continue when k is null;
    if r.tipus = 'vista' and k = 'v' then continue; end if;
    if r.tipus = 'taula' and k in ('r', 'p') then
      select count(*) into falten from unnest(r.columnes) as col(nom)
       where not exists (select 1 from pg_attribute a
                          where a.attrelid = format('public.%I', r.nom)::regclass
                            and a.attname = col.nom and a.attnum > 0 and not a.attisdropped);
      continue when falten = 0;
    end if;
    nou := r.nom || '_antiga';
    if to_regclass(format('public.%I', nou)) is not null then
      nou := nou || '_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
    end if;
    case k
      when 'r', 'p' then execute format('alter table public.%I rename to %I', r.nom, nou);
      when 'v' then execute format('alter view public.%I rename to %I', r.nom, nou);
      when 'm' then execute format('alter materialized view public.%I rename to %I', r.nom, nou);
      when 'f' then execute format('alter foreign table public.%I rename to %I', r.nom, nou);
      when 'S' then execute format('alter sequence public.%I rename to %I', r.nom, nou);
      when 'i', 'I' then execute format('alter index public.%I rename to %I', r.nom, nou);
      else raise exception 'Hi ha un objecte "%" (tipus %) que no és de TradeLab. Canvia-li el nom i torna-ho a executar.', r.nom, k;
    end case;
    raise notice '"%" no era de TradeLab: reanomenat a "%"', r.nom, nou;
  end loop;

  -- Tipus enumerats amb el mateix nom però uns altres valors
  for r in select * from (values
${enums.join(",\n")}
  ) as x(nom, valors) loop
    continue when not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                               where n.nspname = 'public' and t.typname = r.nom);
    continue when exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                           where n.nspname = 'public' and t.typname = r.nom and t.typtype = 'e'
                             and r.valors <@ array(select e.enumlabel::text from pg_enum e where e.enumtypid = t.oid));
    nou := r.nom || '_antiga';
    if exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname = nou) then
      nou := nou || '_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
    end if;
    execute format('alter type public.%I rename to %I', r.nom, nou);
    raise notice 'Tipus "%" no era de TradeLab: reanomenat a "%"', r.nom, nou;
  end loop;

  -- Índexs amb el nostre nom però sobre una altra taula (p. ex. d'una taula apartada)
  for r in select * from (values
${indexes.join(",\n")}
  ) as x(nom, taula) loop
    continue when not exists (select 1 from pg_class ix join pg_namespace n on n.oid = ix.relnamespace
                               where n.nspname = 'public' and ix.relname = r.nom);
    continue when exists (select 1 from pg_index i
                            join pg_class ix on ix.oid = i.indexrelid
                            join pg_class t on t.oid = i.indrelid
                            join pg_namespace n on n.oid = ix.relnamespace
                           where n.nspname = 'public' and ix.relname = r.nom and t.relname = r.taula);
    nou := r.nom || '_antic';
    if to_regclass(format('public.%I', nou)) is not null then
      nou := nou || '_' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
    end if;
    execute format('alter index public.%I rename to %I', r.nom, nou);
    raise notice 'Índex "%" no era de TradeLab: reanomenat a "%"', r.nom, nou;
  end loop;
end $$;`;
}

const DEFAULTS = `-- ── Configuració inicial si falta (no toca la que ja tinguis) ──
insert into public.accounts (name, type, initial_capital, currency, is_default)
select 'Paper TradingView', 'paper', 200, 'EUR', true
where not exists (select 1 from public.accounts where is_default);

insert into public.settings (id, default_account_id, currency, default_risk_pct, risk_warning_pct, max_daily_loss, max_weekly_loss, max_trades_per_day)
select 1, (select id from public.accounts where is_default limit 1), 'EUR', 3, 2, 9, 20, 4
on conflict (id) do nothing;

update public.settings
   set default_account_id = (select id from public.accounts where is_default limit 1)
 where default_account_id is null;`;

function summary(schema: Schema): string {
  const tables = schema.tables.map((t) => t.name);
  const inList = (names: string[]) => names.map(lit).join(", ");
  const count = (relkind: string, names: string[]) =>
    `(select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind in (${relkind}) and c.relname in (${inList(names)}))::text`;
  return `-- ── Resum: totes les files han de dir OK ──
select comprovacio, valor, esperat, case when valor = esperat or (esperat is null and valor is not null) then 'OK' else 'REVISA' end as estat
from (
  select 1 as ordre, 'Taules' as comprovacio, ${count("'r', 'p'", tables)} as valor, '${tables.length}' as esperat
  union all
  select 2, 'Vistes', ${count("'v'", schema.views)}, '${schema.views.length}'
  union all
  select 3, 'Bucket de captures', (select count(*) from storage.buckets where id = 'media')::text, '1'
  union all
  select 4, 'Configuració', (select count(*) from public.settings)::text, '1'
  union all
  select 5, 'Capital actual', (select current_capital || ' ' || currency from public.v_account_balance
                                where account_id = (select default_account_id from public.settings where id = 1)), null
) as resum
order by ordre;`;
}

const HEADER = `-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ TradeLab · INSTAL·LAR                                                  ║
-- ║ L'ÚNIC fitxer que cal per preparar la base de dades a Supabase:        ║
-- ║ SQL Editor → New query → enganxa tot aquest fitxer → Run.              ║
-- ║                                                                        ║
-- ║ · Crea NOMÉS el que falti (tipus, taules, índexs, vistes, triggers,    ║
-- ║   RLS, permisos i el bucket "media").                                  ║
-- ║ · No esborra res: ni les teves operacions ni la configuració.          ║
-- ║ · Si hi ha taules o vistes amb el mateix nom que no són de TradeLab,   ║
-- ║   les reanomena a <nom>_antiga.                                        ║
-- ║ · Es pot executar tantes vegades com calgui (també per reparar una     ║
-- ║   instal·lació a mitges o després d'actualitzar TradeLab).             ║
-- ║ · Al final mostra un resum: totes les files han de dir OK.             ║
-- ║                                                                        ║
-- ║ Generat per scripts/generate-setup-sql.ts a partir de                  ║
-- ║ supabase/migrations/. No l'editis a mà: npm run db:setup-sql           ║
-- ╚══════════════════════════════════════════════════════════════════════╝`;

export function buildSetupSql(migrations: Migration[]): string {
  const schema: Schema = { tables: [], views: [], enums: [], indexes: [] };
  const dropped = new Set<string>();
  const sorted = [...migrations].sort((a, b) => a.name.localeCompare(b.name));
  const body = sorted.map((m) => `-- ─────────── ${m.name} ───────────\n${transform(m, schema, dropped).trim()}`);
  if (!schema.tables.length) throw new SetupSqlError("Les migracions no creen cap taula");

  const dropViews = schema.views.length
    ? `-- Les vistes no guarden dades: s'esborren i es tornen a crear.\ndrop view if exists ${[...schema.views].reverse().map((v) => `public.${v}`).join(", ")} cascade;`
    : "";

  return [
    HEADER,
    protectBlock(schema, dropped),
    `-- ── Pas 2: estructura (idempotent) ──\n${dropViews}`,
    ...body,
    DEFAULTS,
    "notify pgrst, 'reload schema';",
    summary(schema),
  ].join("\n\n") + "\n";
}

export function buildDemoSql(seed: string): string {
  const content = seed.replace(/\r\n/g, "\n").replace(/^-- Generat per .*\n/, "").trim();
  return `-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ TradeLab · DADES D'EXEMPLE (opcional)                                  ║
-- ║ Executa primer INSTAL·LAR.sql. Després: SQL Editor → enganxa aquest    ║
-- ║ fitxer → Run.                                                          ║
-- ║ ATENCIÓ: substitueix comptes, configuració, estratègies, operacions…   ║
-- ║ per les dades d'exemple (les claus d'API es conserven).                ║
-- ║ Per començar de debò després: clean-demo-data.sql.                     ║
-- ║                                                                        ║
-- ║ Generat a partir de supabase/seed.sql. No l'editis a mà:               ║
-- ║ npm run db:setup-sql                                                   ║
-- ╚══════════════════════════════════════════════════════════════════════╝

${content}

notify pgrst, 'reload schema';
`;
}
