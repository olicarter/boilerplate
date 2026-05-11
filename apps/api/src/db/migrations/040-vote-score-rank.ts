import { MigrationInterface, QueryRunner } from 'typeorm';

export class VoteScoreRank1748560000040 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE votes ADD COLUMN IF NOT EXISTS score INTEGER`);
    await runner.query(`ALTER TABLE votes ADD COLUMN IF NOT EXISTS rank_position INTEGER`);
  }
  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE votes DROP COLUMN IF EXISTS score`);
    await runner.query(`ALTER TABLE votes DROP COLUMN IF EXISTS rank_position`);
  }
}
