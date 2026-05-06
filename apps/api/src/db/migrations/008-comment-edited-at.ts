import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommentEditedAt1748000000008 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE comments DROP COLUMN IF EXISTS edited_at;`);
  }
}
