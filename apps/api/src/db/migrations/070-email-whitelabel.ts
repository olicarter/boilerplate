import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailWhitelabel1700000070 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS email_from_name TEXT DEFAULT NULL`);
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS email_from_address TEXT DEFAULT NULL`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS email_from_name`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS email_from_address`);
  }
}
