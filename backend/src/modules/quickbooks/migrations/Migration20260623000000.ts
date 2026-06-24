import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260623000000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "qbo_connection" ("id" text not null, "realm_id" text null, "access_token" text null, "refresh_token" text null, "access_expires_at" timestamptz null, "refresh_expires_at" timestamptz null, "environment" text not null default 'sandbox', "auth_state" text null, "connected_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "qbo_connection_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_qbo_connection_deleted_at" ON "qbo_connection" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "qbo_connection" cascade;`);
  }

}
