import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommentThreads1700000077 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`
      ALTER TABLE comments
        ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE
    `);
    await qr.query(`CREATE INDEX IF NOT EXISTS comments_parent_comment_id ON comments(parent_comment_id)`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE comments DROP COLUMN IF EXISTS parent_comment_id`);
  }
}
