import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProposalAuthorDeadlineThreshold1746403200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE proposals
        ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS closes_at  TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS threshold  INTEGER NOT NULL DEFAULT 50
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE proposals
        DROP COLUMN IF EXISTS author_id,
        DROP COLUMN IF EXISTS closes_at,
        DROP COLUMN IF EXISTS threshold
    `);
  }
}
