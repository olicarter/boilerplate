import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrgFeatures1700000078 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS org_type VARCHAR(30) DEFAULT NULL`);
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}'`);
  }
  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS features`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS org_type`);
  }
}
