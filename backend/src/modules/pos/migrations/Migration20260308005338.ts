import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260308005338 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "receive_log" ("id" text not null, "product_title" text not null, "variant_title" text not null, "sku" text null, "barcode" text null, "quantity_added" integer not null, "new_stock" integer not null default 0, "received_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "receive_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_receive_log_deleted_at" ON "receive_log" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "receive_log" cascade;`);
  }

}
