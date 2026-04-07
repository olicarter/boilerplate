import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Delegation } from './delegation.entity';

@Injectable()
export class DelegationsService {
  constructor(
    @InjectRepository(Delegation)
    private readonly delegationRepo: Repository<Delegation>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Delegation[]> {
    return this.delegationRepo.find({ order: { created_at: 'ASC' } });
  }

  findByDelegator(delegatorId: string): Promise<Delegation[]> {
    return this.delegationRepo.findBy({ delegator_id: delegatorId });
  }

  async create(data: {
    id: string;
    delegator_id: string;
    delegate_id: string;
    topic_id?: string | null;
  }): Promise<{ item: Delegation; txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      const delegation = manager.create(Delegation, { topic_id: null, ...data });
      const saved = await manager.save(delegation);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item: saved, txid: parseInt(row.txid, 10) };
    });
  }

  async delete(id: string): Promise<{ txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(Delegation, id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }
}
