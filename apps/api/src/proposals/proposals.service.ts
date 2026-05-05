import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { Proposal, ProposalStatus } from './proposal.entity';
import { Vote } from '../votes/vote.entity';
import { Delegation } from '../delegations/delegation.entity';
import { DelegationsService } from '../delegations/delegations.service';

export interface TallyResult {
  yes: number;
  no: number;
  abstain: number;
  total: number;
}

export interface DelegationVote {
  delegate_id: string;
  choice: string;
}

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Proposal[]> {
    return this.proposalRepo.find({ order: { created_at: 'DESC' } });
  }

  findOne(id: string): Promise<Proposal | null> {
    return this.proposalRepo.findOneBy({ id });
  }

  async create(data: {
    id: string;
    topic_id: string;
    author_id: string;
    title: string;
    description?: string;
    closes_at?: string | null;
    threshold?: number;
    status?: 'open' | 'draft';
  }): Promise<{ item: Proposal; txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      const proposal = manager.create(Proposal, {
        description: '',
        closed_at: null,
        threshold: 50,
        ...data,
        status: data.status ?? 'open',
        closes_at: data.closes_at ? new Date(data.closes_at) : null,
      });
      const saved = await manager.save(proposal);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item: saved, txid: parseInt(row.txid, 10) };
    });
  }

  async update(
    id: string,
    data: Partial<Pick<Proposal, 'title' | 'description' | 'status' | 'closed_at' | 'closes_at' | 'threshold'>>,
  ): Promise<{ item: Proposal; txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      await manager.update(Proposal, id, data);
      const item = await manager.findOneByOrFail(Proposal, { id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async delete(id: string): Promise<{ txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(Proposal, id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }

  private async transition(
    id: string,
    userId: string,
    from: ProposalStatus | ProposalStatus[],
    to: ProposalStatus,
    patch: Partial<Pick<Proposal, 'status' | 'closed_at'>>,
  ): Promise<{ item: Proposal; txid: number }> {
    const proposal = await this.proposalRepo.findOneByOrFail({ id });
    if (proposal.author_id !== userId) throw new ForbiddenException('Only the author can perform this action');
    const allowed = Array.isArray(from) ? from : [from];
    if (!allowed.includes(proposal.status)) {
      throw new BadRequestException(`Proposal must be ${allowed.join(' or ')} to perform this action`);
    }
    return this.update(id, patch);
  }

  publish(id: string, userId: string) {
    return this.transition(id, userId, 'draft', 'open', { status: 'open' });
  }

  close(id: string, userId: string) {
    return this.transition(id, userId, 'open', 'closed', { status: 'closed', closed_at: new Date() });
  }

  reopen(id: string, userId: string) {
    return this.transition(id, userId, 'closed', 'open', { status: 'open', closed_at: null });
  }

  withdraw(id: string, userId: string) {
    return this.transition(id, userId, ['open', 'closed'], 'withdrawn', { status: 'withdrawn', closed_at: new Date() });
  }

  async autoCloseExpired(): Promise<number> {
    const expired = await this.proposalRepo.find({
      where: { status: 'open', closes_at: LessThanOrEqual(new Date()) },
    });
    if (expired.length === 0) return 0;

    const now = new Date();
    await Promise.all(
      expired.map((p) =>
        this.proposalRepo.update(p.id, { status: 'closed', closed_at: now }),
      ),
    );
    return expired.length;
  }

  private buildDelegationMap(delegations: Delegation[]): Map<string, Map<string | null, string>> {
    const map = new Map<string, Map<string | null, string>>();
    for (const d of delegations) {
      if (!map.has(d.delegator_id)) map.set(d.delegator_id, new Map());
      map.get(d.delegator_id)!.set(d.topic_id, d.delegate_id);
    }
    return map;
  }

  async tally(proposalId: string): Promise<TallyResult> {
    const proposal = await this.proposalRepo.findOneByOrFail({ id: proposalId });

    const votes = await this.dataSource.getRepository(Vote).find({ where: { proposal_id: proposalId } });
    const allDelegations = await this.dataSource.getRepository(Delegation).find();
    const delegations = DelegationsService.activeDelegations(allDelegations);

    const directVotes = new Map<string, string>(votes.map((v) => [v.user_id, v.choice]));
    const delegationMap = this.buildDelegationMap(delegations);

    const MAX_DEPTH = 10;
    const resolveChoice = (startUserId: string): string => {
      const visited = new Set<string>();
      let current = startUserId;
      while (true) {
        if (visited.has(current) || visited.size >= MAX_DEPTH) return 'abstain';
        visited.add(current);
        if (directVotes.has(current)) return directVotes.get(current)!;
        const userDelegations = delegationMap.get(current);
        if (!userDelegations) return 'abstain';
        const next = userDelegations.get(proposal.topic_id) ?? userDelegations.get(null);
        if (!next) return 'abstain';
        current = next;
      }
    };

    const allUsers = new Set<string>([
      ...votes.map((v) => v.user_id),
      ...delegations.map((d) => d.delegator_id),
    ]);

    const tally: TallyResult = { yes: 0, no: 0, abstain: 0, total: 0 };
    for (const userId of allUsers) {
      const choice = resolveChoice(userId);
      if (choice === 'yes') tally.yes++;
      else if (choice === 'no') tally.no++;
      else tally.abstain++;
      tally.total++;
    }
    return tally;
  }

  /** Returns the delegate who voted on behalf of userId, or null if user voted directly / no delegation resolves. */
  async getMyDelegationVote(proposalId: string, userId: string): Promise<DelegationVote | null> {
    const proposal = await this.proposalRepo.findOneByOrFail({ id: proposalId });
    const votes = await this.dataSource.getRepository(Vote).find({ where: { proposal_id: proposalId } });
    const allDelegations = await this.dataSource.getRepository(Delegation).find();
    const delegations = DelegationsService.activeDelegations(allDelegations);

    // User voted directly — no banner needed
    if (votes.find((v) => v.user_id === userId)) return null;

    const directVotes = new Map<string, string>(votes.map((v) => [v.user_id, v.choice]));
    const delegationMap = this.buildDelegationMap(delegations);

    const MAX_DEPTH = 10;
    const visited = new Set<string>([userId]);
    let current = userId;

    while (true) {
      const userDelegations = delegationMap.get(current);
      if (!userDelegations) return null;
      const next = userDelegations.get(proposal.topic_id) ?? userDelegations.get(null);
      if (!next || visited.has(next) || visited.size >= MAX_DEPTH) return null;
      visited.add(next);

      if (directVotes.has(next)) {
        return { delegate_id: next, choice: directVotes.get(next)! };
      }
      current = next;
    }
  }
}
