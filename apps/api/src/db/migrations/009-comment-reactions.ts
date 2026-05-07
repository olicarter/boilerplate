import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommentReactions1748100000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comment_reactions (
        id         UUID        PRIMARY KEY,
        comment_id UUID        NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji      TEXT        NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(comment_id, user_id, emoji)
      );
    `);
    await queryRunner.query(`
      ALTER PUBLICATION electric_publication_default
        SET TABLE public.users, public.topics, public.proposals, public.votes,
                  public.delegations, public.comments, public.comment_reactions;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER PUBLICATION electric_publication_default
        SET TABLE public.users, public.topics, public.proposals, public.votes,
                  public.delegations, public.comments;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS comment_reactions;`);
  }
}
