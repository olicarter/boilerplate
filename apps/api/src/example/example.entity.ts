// Example TypeORM entity — copy this pattern for each database table.
// Register the entity in app.module.ts (entities array) and create a
// corresponding migration in src/db/migrations/.
//
// import {
//   Entity,
//   PrimaryColumn,
//   Column,
//   CreateDateColumn,
// } from 'typeorm';
//
// @Entity('items')
// export class Item {
//   // UUID primary key — generated client-side so optimistic inserts have a
//   // stable key before the API round-trip completes.
//   @PrimaryColumn('uuid')
//   id!: string;
//
//   @Column({ type: 'varchar', length: 500 })
//   name!: string;
//
//   @CreateDateColumn({ type: 'timestamptz' })
//   created_at!: Date;
// }
