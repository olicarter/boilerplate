import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export class OrganisationScoping1748200000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create a default org so existing rows have somewhere to point
    await queryRunner.query(`
      INSERT INTO organisations (id, name, slug, description)
      VALUES ('${DEFAULT_ORG_ID}', 'Default', 'default', '')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Add organisation_id to scoped tables (nullable first so existing rows survive)
    await queryRunner.query(`
      ALTER TABLE topics
        ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
      ALTER TABLE proposals
        ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
      ALTER TABLE delegations
        ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
    `);

    // Back-fill existing rows
    await queryRunner.query(`
      UPDATE topics      SET organisation_id = '${DEFAULT_ORG_ID}' WHERE organisation_id IS NULL;
      UPDATE proposals   SET organisation_id = '${DEFAULT_ORG_ID}' WHERE organisation_id IS NULL;
      UPDATE delegations SET organisation_id = '${DEFAULT_ORG_ID}' WHERE organisation_id IS NULL;
    `);

    // Now make NOT NULL
    await queryRunner.query(`
      ALTER TABLE topics      ALTER COLUMN organisation_id SET NOT NULL;
      ALTER TABLE proposals   ALTER COLUMN organisation_id SET NOT NULL;
      ALTER TABLE delegations ALTER COLUMN organisation_id SET NOT NULL;
    `);

    // Add all existing users as members of the default org
    await queryRunner.query(`
      INSERT INTO memberships (id, organisation_id, user_id, role)
      SELECT gen_random_uuid(), '${DEFAULT_ORG_ID}', id, 'member'
      FROM users
      ON CONFLICT (organisation_id, user_id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM memberships WHERE organisation_id = '${DEFAULT_ORG_ID}';`);
    await queryRunner.query(`
      ALTER TABLE topics      DROP COLUMN IF EXISTS organisation_id;
      ALTER TABLE proposals   DROP COLUMN IF EXISTS organisation_id;
      ALTER TABLE delegations DROP COLUMN IF EXISTS organisation_id;
    `);
    await queryRunner.query(`DELETE FROM organisations WHERE id = '${DEFAULT_ORG_ID}';`);
  }
}
