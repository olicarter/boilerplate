import { MigrationInterface, QueryRunner } from 'typeorm';

export class OidcSso1700000072 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS oidc_issuer TEXT DEFAULT NULL`);
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS oidc_client_id TEXT DEFAULT NULL`);
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS oidc_client_secret TEXT DEFAULT NULL`);
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS sso_required BOOLEAN NOT NULL DEFAULT FALSE`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS oidc_issuer`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS oidc_client_id`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS oidc_client_secret`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS sso_required`);
  }
}
