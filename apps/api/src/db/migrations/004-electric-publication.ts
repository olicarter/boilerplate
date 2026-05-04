import { MigrationInterface, QueryRunner } from 'typeorm';

export class ElectricPublication1746489600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the publication if it doesn't exist yet (fresh setups where init.sql ran before
    // this migration), then set exactly the tables we want to sync via Electric.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'electric_publication_default') THEN
          CREATE PUBLICATION electric_publication_default;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER PUBLICATION electric_publication_default
        SET TABLE public.users, public.topics, public.proposals, public.votes, public.delegations;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally left empty — don't drop the publication on rollback.
  }
}
