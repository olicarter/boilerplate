import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreditDecay068 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS credit_period_days INTEGER DEFAULT NULL`);
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS credits_allocated_at TIMESTAMPTZ DEFAULT NULL`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS credits_allocated_at`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS credit_period_days`);
  }
}
