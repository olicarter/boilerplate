import type { MigrationInterface, QueryRunner } from 'typeorm';

export class VotingVisibility1748200000017 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE organisations
        ADD COLUMN voting_visibility VARCHAR(20) NOT NULL DEFAULT 'public';
    `);
  }

  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS voting_visibility`);
  }
}
