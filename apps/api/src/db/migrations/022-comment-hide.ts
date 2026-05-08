import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommentHide1748200000022 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE comments
        ADD COLUMN hidden_by UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN hidden_reason VARCHAR(500)
    `);
  }

  async down(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE comments DROP COLUMN hidden_reason, DROP COLUMN hidden_by
    `);
  }
}
