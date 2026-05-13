import { MigrationInterface, QueryRunner } from 'typeorm';

export class Scim1748600000073 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS scim_token TEXT DEFAULT NULL`);
    await qr.query(`CREATE UNIQUE INDEX IF NOT EXISTS organisations_scim_token ON organisations(scim_token) WHERE scim_token IS NOT NULL`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`DROP INDEX IF EXISTS organisations_scim_token`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS scim_token`);
  }
}
