import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrgInvites054 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      CREATE TABLE org_invites (
        id UUID PRIMARY KEY,
        org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ DEFAULT NULL
      )
    `);
    await runner.query(`CREATE INDEX idx_org_invites_token ON org_invites(token)`);
    await runner.query(`CREATE INDEX idx_org_invites_org ON org_invites(org_id)`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`DROP TABLE org_invites`);
  }
}
