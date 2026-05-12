import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnonymousVoting1748560000048 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS anonymous_voting BOOLEAN NOT NULL DEFAULT false
    `);
  }
  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS anonymous_voting`);
  }
}
