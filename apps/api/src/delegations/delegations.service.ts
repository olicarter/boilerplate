import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Delegation } from './delegation.entity';

const MAX_DELEGATION_DEPTH = 10;

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

  static activeDelegations(delegations: Delegation[]): Delegation[] {
    const now = new Date();
    return delegations.filter((d) => !d.expires_at || d.expires_at > now);
  }

  private wouldCreateCycle(
    delegatorId: string,
    delegateId: string,
    existing: Delegation[],
  ): boolean {
    // Build adjacency list across active delegations only
    const graph = new Map<string, string[]>();
    for (const d of DelegationsService.activeDelegations(existing)) {
      if (!graph.has(d.delegator_id)) graph.set(d.delegator_id, []);
      graph.get(d.delegator_id)!.push(d.delegate_id);
    }

    // BFS from delegateId — if we reach delegatorId, adding this edge creates a cycle
    const visited = new Set<string>();
    const queue = [delegateId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === delegatorId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      if (visited.size > MAX_DELEGATION_DEPTH) break;
      for (const next of graph.get(current) ?? []) queue.push(next);
    }
    return false;
  }

  async create(data: {
    id: string;
    delegator_id: string;
    delegate_id: string;
    topic_id?: string | null;
    expires_at?: string | null;
  }): Promise<{ item: Delegation; txid: number }> {
    if (data.delegator_id === data.delegate_id) {
      throw new BadRequestException('You cannot delegate to yourself');
    }

    const existing = await this.delegationRepo.find();
    if (this.wouldCreateCycle(data.delegator_id, data.delegate_id, existing)) {
      throw new BadRequestException('This delegation would create a circular chain');
    }

    return this.dataSource.transaction(async (manager) => {
      const delegation = manager.create(Delegation, {
        topic_id: null,
        ...data,
        expires_at: data.expires_at ? new Date(data.expires_at) : null,
      });
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
