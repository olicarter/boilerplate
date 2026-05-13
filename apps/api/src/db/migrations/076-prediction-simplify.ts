import { MigrationInterface, QueryRunner } from 'typeorm';

export class PredictionSimplify1700000076 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE predictions DROP COLUMN IF EXISTS stake`);
    await qr.query(`ALTER TABLE predictions DROP COLUMN IF EXISTS resolved`);
    await qr.query(`ALTER TABLE predictions DROP COLUMN IF EXISTS payout`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE predictions ADD COLUMN stake INTEGER NOT NULL DEFAULT 10`);
    await qr.query(`ALTER TABLE predictions ADD COLUMN resolved BOOLEAN NOT NULL DEFAULT FALSE`);
    await qr.query(`ALTER TABLE predictions ADD COLUMN payout INTEGER DEFAULT NULL`);
  }
}
