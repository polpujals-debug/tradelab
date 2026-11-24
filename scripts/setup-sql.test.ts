import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generatedFiles } from "./generate-setup-sql";
import { buildSetupSql } from "./setup-sql";

describe("supabase/INSTAL·LAR.sql", () => {
  it.each(Object.entries(generatedFiles()))("%s està al dia amb les migracions (npm run db:setup-sql)", (file, content) => {
    expect(readFileSync(path.join(__dirname, "..", "supabase", file), "utf8")).toBe(content);
  });

  it("fa idempotents les sentències de creació", () => {
    const sql = buildSetupSql([
      {
        name: "1.sql",
        sql: [
          "create type color as enum ('red', 'blue');",
          "create table items (\n  id uuid primary key,\n  data jsonb not null default '{\"a\":1,\"b\":2}',\n  color color\n);",
          "create index items_color on items (color);",
          "create view v_items as select * from items;",
          "create trigger items_t before update on items for each row execute function f();",
          "alter table items add column note text;",
        ].join("\n"),
      },
    ]);
    expect(sql).toContain("exception when duplicate_object then null");
    expect(sql).toContain("create table if not exists items (");
    expect(sql).toContain("create index if not exists items_color on items");
    expect(sql).toContain("drop view if exists public.v_items cascade;");
    expect(sql).toContain("drop trigger if exists items_t on items;\ncreate trigger items_t");
    expect(sql).toContain("add column if not exists note text");
    expect(sql).toContain("('items', 'taula', array['id', 'data', 'color']::text[])");
  });

  it("rebutja patrons que fallarien la segona vegada", () => {
    const build = (sql: string) => () => buildSetupSql([{ name: "1.sql", sql: `create table t (\n  id int\n);\n${sql}` }]);
    expect(build("alter table t add constraint c check (id > 0);")).toThrow(/add constraint/);
    expect(build("create sequence s;")).toThrow(/no idempotent/);
    expect(build("insert into t values (1);")).toThrow(/on conflict/);
  });
});
