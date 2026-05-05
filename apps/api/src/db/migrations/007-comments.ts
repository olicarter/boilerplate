import { MigrationInterface, QueryRunner } from 'typeorm';

export class Comments1746576000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id          UUID        PRIMARY KEY,
        proposal_id UUID        NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        author_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
        body        TEXT        NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      ALTER PUBLICATION electric_publication_default
        SET TABLE public.users, public.topics, public.proposals, public.votes, public.delegations, public.comments;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER PUBLICATION electric_publication_default
        SET TABLE public.users, public.topics, public.proposals, public.votes, public.delegations;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS comments;`);
  }
}
