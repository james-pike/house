import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260623233444 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "qbo_po_receipt" ("id" text not null, "line_id" text not null, "purchase_order_id" text null, "variant_id" text null, "qty" integer not null default 0, "received_by" text null, "note" text null, "received_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "qbo_po_receipt_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qbo_po_receipt_line_id" ON "qbo_po_receipt" ("line_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qbo_po_receipt_deleted_at" ON "qbo_po_receipt" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "qbo_po_receipt" add constraint "qbo_po_receipt_line_id_foreign" foreign key ("line_id") references "qbo_purchase_order_line" ("id") on update cascade;`);

    this.addSql(`alter table if exists "qbo_purchase_order" add column if not exists "closed" boolean not null default false, add column if not exists "closed_at" timestamptz null, add column if not exists "received_by" text null;`);

    this.addSql(`alter table if exists "qbo_purchase_order_line" add column if not exists "closed" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "qbo_po_receipt" cascade;`);

    this.addSql(`alter table if exists "qbo_purchase_order" drop column if exists "closed", drop column if exists "closed_at", drop column if exists "received_by";`);

    this.addSql(`alter table if exists "qbo_purchase_order_line" drop column if exists "closed";`);
  }

}
