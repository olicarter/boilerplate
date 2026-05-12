import { MigrationInterface, QueryRunner } from 'typeorm';

export class DataRetention063 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS data_retention_months INTEGER DEFAULT NULL`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS data_retention_months`);
  }
}
