import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260302031645 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "pos_session" ("id" text not null, "cashier_id" text not null, "status" text check ("status" in ('open', 'closed')) not null default 'open', "opening_cash" numeric not null default 0, "closing_cash" numeric null, "expected_cash" numeric null, "discrepancy" numeric null, "notes" text null, "opened_at" timestamptz not null, "closed_at" timestamptz null, "raw_opening_cash" jsonb not null default '{"value":"0","precision":20}', "raw_closing_cash" jsonb null, "raw_expected_cash" jsonb null, "raw_discrepancy" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pos_session_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_session_deleted_at" ON "pos_session" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pos_transaction" ("id" text not null, "session_id" text not null, "order_id" text null, "payment_method" text check ("payment_method" in ('cash', 'card')) not null, "subtotal" numeric not null, "tax" numeric not null default 0, "total" numeric not null, "amount_tendered" numeric null, "change_given" numeric null, "raw_subtotal" jsonb not null, "raw_tax" jsonb not null default '{"value":"0","precision":20}', "raw_total" jsonb not null, "raw_amount_tendered" jsonb null, "raw_change_given" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pos_transaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_transaction_session_id" ON "pos_transaction" ("session_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pos_transaction_deleted_at" ON "pos_transaction" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "pos_transaction" add constraint "pos_transaction_session_id_foreign" foreign key ("session_id") references "pos_session" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "pos_transaction" drop constraint if exists "pos_transaction_session_id_foreign";`);

    this.addSql(`drop table if exists "pos_session" cascade;`);

    this.addSql(`drop table if exists "pos_transaction" cascade;`);
  }

}
