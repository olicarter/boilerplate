import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvictionVoting066 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS conviction_voting BOOLEAN DEFAULT FALSE`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS conviction_voting`);
  }
}
