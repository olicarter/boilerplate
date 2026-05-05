import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { Proposal, ProposalStatus } from './proposal.entity';
import { Vote } from '../votes/vote.entity';
import { Delegation } from '../delegations/delegation.entity';

export interface TallyResult {
  yes: number;
  no: number;
  abstain: number;
  total: number;
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
  }): Promise<{ item: Proposal; txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      const proposal = manager.create(Proposal, {
        description: '',
        status: 'open',
        closed_at: null,
        threshold: 50,
        ...data,
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
      throw new BadRequestException(`Proposal must be ${allowed.join(' or ')} to ${to}`);
    }
    return this.update(id, patch);
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

  /**
   * Tally votes for a proposal, walking delegation chains.
   * For each user who hasn't voted directly, follow their topic-specific
   * delegation (then global fallback), taking the first direct vote found.
   * Cycles result in abstain.
   */
  async tally(proposalId: string): Promise<TallyResult> {
    const proposal = await this.proposalRepo.findOneByOrFail({ id: proposalId });

    const votes = await this.dataSource.getRepository(Vote).find({ where: { proposal_id: proposalId } });
    const delegations = await this.dataSource.getRepository(Delegation).find();

    const directVotes = new Map<string, string>(votes.map((v) => [v.user_id, v.choice]));

    const delegationMap = new Map<string, Map<string | null, string>>();
    for (const d of delegations) {
      if (!delegationMap.has(d.delegator_id)) delegationMap.set(d.delegator_id, new Map());
      delegationMap.get(d.delegator_id)!.set(d.topic_id, d.delegate_id);
    }

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
}
