import { MigrationInterface, QueryRunner } from 'typeorm';

export class Arguments1748200000023 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      CREATE TABLE arguments (
        id UUID PRIMARY KEY,
        proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        author_id UUID REFERENCES users(id) ON DELETE SET NULL,
        side VARCHAR(7) NOT NULL CHECK (side IN ('for', 'against')),
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await runner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'electric_publication_default') THEN
          ALTER PUBLICATION electric_publication_default ADD TABLE public.arguments;
        END IF;
      END $$;
    `);
  }

  async down(runner: QueryRunner) {
    await runner.query(`DROP TABLE IF EXISTS arguments`);
  }
}
