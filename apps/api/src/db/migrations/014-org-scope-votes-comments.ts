import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OrgScopeVotesComments1748200000014 implements MigrationInterface {
  async up(runner: QueryRunner) {
    // Add organisation_id to votes, backfill from proposals, then enforce NOT NULL
    await runner.query(`ALTER TABLE votes ADD COLUMN organisation_id uuid`);
    await runner.query(`
      UPDATE votes v
      SET organisation_id = p.organisation_id
      FROM proposals p
      WHERE v.proposal_id = p.id
    `);
    await runner.query(`ALTER TABLE votes ALTER COLUMN organisation_id SET NOT NULL`);
    await runner.query(`CREATE INDEX idx_votes_organisation_id ON votes (organisation_id)`);

    // Add organisation_id to comments, backfill from proposals
    await runner.query(`ALTER TABLE comments ADD COLUMN organisation_id uuid`);
    await runner.query(`
      UPDATE comments c
      SET organisation_id = p.organisation_id
      FROM proposals p
      WHERE c.proposal_id = p.id
    `);
    await runner.query(`ALTER TABLE comments ALTER COLUMN organisation_id SET NOT NULL`);
    await runner.query(`CREATE INDEX idx_comments_organisation_id ON comments (organisation_id)`);

    // Add organisation_id to comment_reactions, backfill via comments
    await runner.query(`ALTER TABLE comment_reactions ADD COLUMN organisation_id uuid`);
    await runner.query(`
      UPDATE comment_reactions cr
      SET organisation_id = c.organisation_id
      FROM comments c
      WHERE cr.comment_id = c.id
    `);
    await runner.query(`ALTER TABLE comment_reactions ALTER COLUMN organisation_id SET NOT NULL`);
    await runner.query(`CREATE INDEX idx_comment_reactions_organisation_id ON comment_reactions (organisation_id)`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`DROP INDEX IF EXISTS idx_comment_reactions_organisation_id`);
    await runner.query(`ALTER TABLE comment_reactions DROP COLUMN IF EXISTS organisation_id`);
    await runner.query(`DROP INDEX IF EXISTS idx_comments_organisation_id`);
    await runner.query(`ALTER TABLE comments DROP COLUMN IF EXISTS organisation_id`);
    await runner.query(`DROP INDEX IF EXISTS idx_votes_organisation_id`);
    await runner.query(`ALTER TABLE votes DROP COLUMN IF EXISTS organisation_id`);
  }
}
