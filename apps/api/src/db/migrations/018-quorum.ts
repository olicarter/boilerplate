import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Quorum1748200000018 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE organisations
        ADD COLUMN default_quorum INTEGER DEFAULT NULL;
      ALTER TABLE proposals
        ADD COLUMN quorum INTEGER DEFAULT NULL;
    `);
  }

  async down(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE organisations DROP COLUMN IF EXISTS default_quorum;
      ALTER TABLE proposals DROP COLUMN IF EXISTS quorum;
    `);
  }
}
