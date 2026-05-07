import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProposalVersions1748100000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS proposal_versions (
        id          UUID        PRIMARY KEY,
        proposal_id UUID        NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        changed_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
        title       TEXT        NOT NULL,
        description TEXT        NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS proposal_versions;`);
  }
}
