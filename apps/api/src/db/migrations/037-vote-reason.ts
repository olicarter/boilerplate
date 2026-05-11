import { MigrationInterface, QueryRunner } from 'typeorm';

export class VoteReason1748560000037 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE votes ADD COLUMN IF NOT EXISTS reason TEXT`);
  }
  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE votes DROP COLUMN IF EXISTS reason`);
  }
}
