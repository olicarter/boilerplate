// Example NestJS service showing CRUD with the ElectricSQL txid pattern.
//
// Every mutation wraps the write in a transaction and captures the Postgres
// transaction ID via `SELECT pg_current_xact_id()::text`. The frontend uses
// this txid to reconcile the optimistic local row with the committed Postgres
// row once ElectricSQL streams it back.
//
// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { DataSource, Repository } from 'typeorm';
// import { Item } from './example.entity';
//
// @Injectable()
// export class ExampleService {
//   constructor(
//     @InjectRepository(Item)
//     private readonly itemRepo: Repository<Item>,
//     private readonly dataSource: DataSource,
//   ) {}
//
//   findAll(): Promise<Item[]> {
//     return this.itemRepo.find({ order: { created_at: 'ASC' } });
//   }
//
//   async create(data: { name: string; id?: string }): Promise<{ item: Item; txid: number }> {
//     return this.dataSource.transaction(async (manager) => {
//       const item = manager.create(Item, {
//         name: data.name,
//         id: data.id ?? crypto.randomUUID(),
//       });
//       const saved = await manager.save(item);
//       const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
//       return { item: saved, txid: parseInt(row.txid, 10) };
//     });
//   }
//
//   async update(
//     id: string,
//     data: Partial<Pick<Item, 'name'>>,
//   ): Promise<{ item: Item; txid: number }> {
//     return this.dataSource.transaction(async (manager) => {
//       await manager.update(Item, id, data);
//       const item = await manager.findOneByOrFail(Item, { id });
//       const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
//       return { item, txid: parseInt(row.txid, 10) };
//     });
//   }
//
//   async delete(id: string): Promise<{ txid: number }> {
//     return this.dataSource.transaction(async (manager) => {
//       await manager.delete(Item, id);
//       const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
//       return { txid: parseInt(row.txid, 10) };
//     });
//   }
// }
