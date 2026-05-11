import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultipleChoice1748200000032 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE proposal_options (
        id UUID PRIMARY KEY,
        proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        organisation_id UUID NOT NULL,
        text VARCHAR(500) NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await runner.query(`ALTER TABLE votes ALTER COLUMN choice DROP NOT NULL`);
    await runner.query(`ALTER TABLE votes ADD COLUMN option_id UUID REFERENCES proposal_options(id) ON DELETE SET NULL`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE votes DROP COLUMN option_id`);
    await runner.query(`ALTER TABLE votes ALTER COLUMN choice SET NOT NULL`);
    await runner.query(`DROP TABLE proposal_options`);
  }
}
