import { MigrationInterface, QueryRunner } from 'typeorm';

// Example migration — copy this file for each schema change.
// Naming convention: <sequential-number>-<description>.ts
// Class naming convention: <Description><UnixTimestamp> implements MigrationInterface
export class Example1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension (required for gen_random_uuid() primary keys)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Example: create a table with a UUID primary key.
    // UUID primary keys are required for ElectricSQL client-side optimistic inserts —
    // the client generates the id before the API round-trip so the optimistic row
    // has a stable key that matches the eventual Postgres row.
    //
    // await queryRunner.query(`
    //   CREATE TABLE IF NOT EXISTS items (
    //     id         UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    //     name       VARCHAR(500) NOT NULL,
    //     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    //   )
    // `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // await queryRunner.query(`DROP TABLE IF EXISTS items CASCADE`);
  }
}
