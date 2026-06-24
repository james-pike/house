import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260623231926 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "qbo_connection" ("id" text not null, "realm_id" text null, "access_token" text null, "refresh_token" text null, "access_expires_at" timestamptz null, "refresh_expires_at" timestamptz null, "environment" text not null default 'sandbox', "auth_state" text null, "connected_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "qbo_connection_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qbo_connection_deleted_at" ON "qbo_connection" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "qbo_purchase_order" ("id" text not null, "qbo_id" text not null, "doc_number" text null, "vendor_name" text null, "vendor_ref" text null, "status" text check ("status" in ('open', 'closed')) not null default 'open', "txn_date" timestamptz null, "total" numeric not null default 0, "synced_at" timestamptz null, "raw_total" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "qbo_purchase_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qbo_purchase_order_deleted_at" ON "qbo_purchase_order" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "qbo_purchase_order_line" ("id" text not null, "purchase_order_id" text not null, "qbo_line_id" text null, "item_ref" text null, "item_name" text null, "sku" text null, "description" text null, "qty_ordered" integer not null default 0, "unit_cost" numeric not null default 0, "amount" numeric not null default 0, "variant_id" text null, "qty_received" integer not null default 0, "raw_unit_cost" jsonb not null default '{"value":"0","precision":20}', "raw_amount" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "qbo_purchase_order_line_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qbo_purchase_order_line_purchase_order_id" ON "qbo_purchase_order_line" ("purchase_order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qbo_purchase_order_line_deleted_at" ON "qbo_purchase_order_line" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "qbo_purchase_order_line" add constraint "qbo_purchase_order_line_purchase_order_id_foreign" foreign key ("purchase_order_id") references "qbo_purchase_order" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "qbo_purchase_order_line" drop constraint if exists "qbo_purchase_order_line_purchase_order_id_foreign";`);

    this.addSql(`drop table if exists "qbo_connection" cascade;`);

    this.addSql(`drop table if exists "qbo_purchase_order" cascade;`);

    this.addSql(`drop table if exists "qbo_purchase_order_line" cascade;`);
  }

}
