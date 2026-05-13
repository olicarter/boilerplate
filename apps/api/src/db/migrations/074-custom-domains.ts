import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomDomains1748600000074 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS custom_domain TEXT DEFAULT NULL`);
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN NOT NULL DEFAULT FALSE`);
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ DEFAULT NULL`);
    await qr.query(`CREATE UNIQUE INDEX IF NOT EXISTS organisations_custom_domain ON organisations(custom_domain) WHERE custom_domain IS NOT NULL`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`DROP INDEX IF EXISTS organisations_custom_domain`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS custom_domain_verified_at`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS custom_domain_verified`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS custom_domain`);
  }
}
