import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDocumentsAndTeams1746403200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS document_updates CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_references CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_versions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS documents CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS teams CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        name        VARCHAR(255) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        title       VARCHAR(500) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        topic_id    UUID REFERENCES topics(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at  TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_number  INTEGER NOT NULL,
        yjs_snapshot    BYTEA NOT NULL,
        state_vector    BYTEA NOT NULL,
        published_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        published_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notes           TEXT NOT NULL DEFAULT '',
        UNIQUE (document_id, version_number)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_references (
        id                        UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        proposal_id               UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        document_id               UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        relative_position_start   BYTEA NOT NULL,
        relative_position_end     BYTEA NOT NULL,
        excerpt                   TEXT NOT NULL,
        created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_updates (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        operation   BYTEA NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }
}
