import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const investigations = sqliteTable("investigations", {
  owner: text("owner").notNull(),
  id: text("id").notNull(),
  revision: integer("revision").notNull(),
  updated: text("updated").notNull(),
  document: text("document").notNull(),
}, t => [primaryKey({columns: [t.owner, t.id]})]);
