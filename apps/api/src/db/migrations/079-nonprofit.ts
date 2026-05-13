import { MigrationInterface, QueryRunner } from 'typeorm';

export class Nonprofit1700000079 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS nonprofit_name TEXT DEFAULT NULL`);
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS nonprofit_registration_number TEXT DEFAULT NULL`);
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS nonprofit_country TEXT DEFAULT NULL`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS nonprofit_country`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS nonprofit_registration_number`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS nonprofit_name`);
  }
}
