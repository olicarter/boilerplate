import { MigrationInterface, QueryRunner } from 'typeorm';

export class Organisations1748200000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organisations (
        id          UUID        PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        slug        VARCHAR(100) NOT NULL UNIQUE,
        description TEXT        NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id              UUID        PRIMARY KEY,
        organisation_id UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role            VARCHAR(20) NOT NULL DEFAULT 'member',
        joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        invited_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(organisation_id, user_id)
      );
    `);
    await queryRunner.query(`
      ALTER PUBLICATION electric_publication_default
        ADD TABLE public.organisations, public.memberships;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER PUBLICATION electric_publication_default
        SET TABLE public.users, public.topics, public.proposals, public.votes,
                  public.delegations, public.comments, public.comment_reactions,
                  public.proposal_versions;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS memberships;`);
    await queryRunner.query(`DROP TABLE IF EXISTS organisations;`);
  }
}
