import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeliberationWindow1748200000026 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE proposals ADD COLUMN deliberation_ends_at TIMESTAMPTZ DEFAULT NULL
    `);
  }

  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS deliberation_ends_at`);
  }
}
