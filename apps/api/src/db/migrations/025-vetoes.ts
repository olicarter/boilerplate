import { MigrationInterface, QueryRunner } from 'typeorm';

export class Vetoes1748200000025 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      CREATE TABLE vetoes (
        id UUID PRIMARY KEY,
        proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (proposal_id, author_id)
      )
    `);
    await runner.query(`
      ALTER TABLE organisations ADD COLUMN veto_role VARCHAR(20) NOT NULL DEFAULT 'admin'
    `);
    await runner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'electric_publication_default') THEN
          ALTER PUBLICATION electric_publication_default ADD TABLE public.vetoes;
        END IF;
      END $$;
    `);
  }

  async down(runner: QueryRunner) {
    await runner.query(`DROP TABLE IF EXISTS vetoes`);
    await runner.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS veto_role`);
  }
}
