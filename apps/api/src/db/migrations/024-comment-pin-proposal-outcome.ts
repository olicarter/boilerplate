import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommentPinProposalOutcome1748200000024 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE comments ADD COLUMN pinned_at TIMESTAMPTZ`);
    await runner.query(`ALTER TABLE proposals ADD COLUMN outcome VARCHAR(20)`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE comments DROP COLUMN pinned_at`);
    await runner.query(`ALTER TABLE proposals DROP COLUMN outcome`);
  }
}
