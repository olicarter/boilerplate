import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1744070400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        name        VARCHAR(255) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        topic_id    UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        title       VARCHAR(500) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status      VARCHAR(10) NOT NULL DEFAULT 'open',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at   TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS delegations (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        delegator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        delegate_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        topic_id     UUID REFERENCES topics(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (delegator_id, topic_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        choice      VARCHAR(10) NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (proposal_id, user_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS votes CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS delegations CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS proposals CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS topics CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
  }
}
