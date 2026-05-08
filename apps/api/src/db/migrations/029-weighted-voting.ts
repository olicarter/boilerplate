import { MigrationInterface, QueryRunner } from 'typeorm';

export class WeightedVoting1748200000029 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS weight integer NOT NULL DEFAULT 1`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE memberships DROP COLUMN IF EXISTS weight`);
  }
}
