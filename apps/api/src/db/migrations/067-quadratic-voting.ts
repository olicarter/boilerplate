import { MigrationInterface, QueryRunner } from 'typeorm';

export class QuadraticVoting1748600000067 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS quadratic_voting BOOLEAN DEFAULT FALSE`);
    await qr.query(`ALTER TABLE votes ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 1`);
    await qr.query(`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT NULL`);
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS quadratic_credits INTEGER DEFAULT NULL`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS quadratic_credits`);
    await qr.query(`ALTER TABLE memberships DROP COLUMN IF EXISTS credits_balance`);
    await qr.query(`ALTER TABLE votes DROP COLUMN IF EXISTS vote_count`);
    await qr.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS quadratic_voting`);
  }
}
