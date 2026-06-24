import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260623235351 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "qbo_sales_sync_log" ("id" text not null, "order_id" text not null, "qbo_doc_id" text null, "qbo_doc_type" text not null default 'SalesReceipt', "status" text check ("status" in ('pending', 'synced', 'error')) not null default 'pending', "error" text null, "total" numeric not null default 0, "synced_at" timestamptz null, "raw_total" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "qbo_sales_sync_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qbo_sales_sync_log_deleted_at" ON "qbo_sales_sync_log" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "qbo_purchase_order" add column if not exists "qbo_bill_id" text null, add column if not exists "billed_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "qbo_sales_sync_log" cascade;`);

    this.addSql(`alter table if exists "qbo_purchase_order" drop column if exists "qbo_bill_id", drop column if exists "billed_at";`);
  }

}
