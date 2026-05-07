import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Proposal, ProposalStatus } from './proposal.entity';
import { ProposalVersion } from './proposal-version.entity';
import { Vote } from '../votes/vote.entity';
import { Delegation } from '../delegations/delegation.entity';
import { Organisation } from '../organisations/organisation.entity';
import { Membership } from '../organisations/membership.entity';
import { DelegationsService } from '../delegations/delegations.service';

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 10_000;

export interface TallyResult {
  yes: number;
  no: number;
  abstain: number;
  total: number;
  eligible_count: number | null;
  quorum_met: boolean | null;
}

export interface DelegationVote {
  delegate_id: string;
  choice: string;
}

const ROLE_RANK: Record<string, number> = { member: 1, moderator: 2, admin: 3 };

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(ProposalVersion)
    private readonly versionRepo: Repository<ProposalVersion>,
    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,
    @InjectRepository(Membership)
    private readonly memberRepo: Repository<Membership>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Proposal[]> {
    return this.proposalRepo.find({ order: { created_at: 'DESC' } });
  }

  findByOrg(organisationId: string): Promise<Proposal[]> {
    return this.proposalRepo.find({ where: { organisation_id: organisationId }, order: { created_at: 'DESC' } });
  }

  findOne(id: string): Promise<Proposal | null> {
    return this.proposalRepo.findOneBy({ id });
  }

  async create(data: {
    id: string;
    organisation_id: string;
    topic_id: string;
    author_id: string;
    title: string;
    description?: string;
    closes_at?: string | null;
    threshold?: number;
    quorum?: number | null;
    status?: 'open' | 'draft';
  }): Promise<{ item: Proposal; txid: number }> {
    const title = data.title?.trim();
    if (!title) throw new BadRequestException('Title is required');
    if (title.length > TITLE_MAX) throw new BadRequestException(`Title must be ${TITLE_MAX} characters or fewer`);
    if (data.description && data.description.length > DESCRIPTION_MAX) {
      throw new BadRequestException(`Description must be ${DESCRIPTION_MAX} characters or fewer`);
    }

    const org = await this.orgRepo.findOneBy({ id: data.organisation_id });
    if (!org) throw new NotFoundException('Organisation not found');
    const membership = await this.memberRepo.findOneBy({ organisation_id: data.organisation_id, user_id: data.author_id });
    if (!membership) throw new ForbiddenException('Not a member of this organisation');
    const required = ROLE_RANK[org.proposal_creation_role] ?? 1;
    const actual = ROLE_RANK[membership.role] ?? 0;
    if (actual < required) {
      throw new ForbiddenException(`Only ${org.proposal_creation_role}s and above can create proposals`);
    }

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

  private async canModerate(orgId: string, userId: string): Promise<boolean> {
    const m = await this.memberRepo.findOneBy({ organisation_id: orgId, user_id: userId });
    return !!m && (ROLE_RANK[m.role] ?? 0) >= ROLE_RANK['moderator'];
  }

  async edit(
    id: string,
    userId: string,
    data: { title?: string; description?: string },
  ): Promise<{ item: Proposal; txid: number }> {
    const proposal = await this.proposalRepo.findOneByOrFail({ id });
    if (proposal.author_id !== userId && !(await this.canModerate(proposal.organisation_id, userId))) {
      throw new ForbiddenException('Only the author or a moderator can edit this proposal');
    }
    if (!['open', 'draft'].includes(proposal.status)) {
      throw new BadRequestException('Only open or draft proposals can be edited');
    }
    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title) throw new BadRequestException('Title is required');
      if (title.length > TITLE_MAX) throw new BadRequestException(`Title must be ${TITLE_MAX} characters or fewer`);
      data = { ...data, title };
    }
    if (data.description !== undefined && data.description.length > DESCRIPTION_MAX) {
      throw new BadRequestException(`Description must be ${DESCRIPTION_MAX} characters or fewer`);
    }

    // Save a version snapshot of the current state before overwriting
    await this.versionRepo.save(
      this.versionRepo.create({
        id: randomUUID(),
        proposal_id: id,
        changed_by: userId,
        title: proposal.title,
        description: proposal.description ?? '',
      }),
    );

    return this.update(id, data);
  }

  async listVersions(proposalId: string): Promise<ProposalVersion[]> {
    return this.versionRepo.find({
      where: { proposal_id: proposalId },
      order: { created_at: 'DESC' },
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
    allowModerator = false,
  ): Promise<{ item: Proposal; txid: number }> {
    const proposal = await this.proposalRepo.findOneByOrFail({ id });
    if (proposal.author_id !== userId) {
      const permitted = allowModerator && await this.canModerate(proposal.organisation_id, userId);
      if (!permitted) throw new ForbiddenException('Only the author or a moderator can perform this action');
    }
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
    return this.transition(id, userId, 'open', 'closed', { status: 'closed', closed_at: new Date() }, true);
  }

  reopen(id: string, userId: string) {
    return this.transition(id, userId, 'closed', 'open', { status: 'open', closed_at: null }, true);
  }

  withdraw(id: string, userId: string) {
    return this.transition(id, userId, ['open', 'closed'], 'withdrawn', { status: 'withdrawn', closed_at: new Date() }, true);
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
    const allDelegations = await this.dataSource.getRepository(Delegation).find({ where: { organisation_id: proposal.organisation_id } });
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

    const tally: TallyResult = { yes: 0, no: 0, abstain: 0, total: 0, eligible_count: null, quorum_met: null };
    for (const userId of allUsers) {
      const choice = resolveChoice(userId);
      if (choice === 'yes') tally.yes++;
      else if (choice === 'no') tally.no++;
      else tally.abstain++;
      tally.total++;
    }

    if (proposal.quorum != null) {
      const eligibleCount = await this.memberRepo.count({
        where: { organisation_id: proposal.organisation_id },
      });
      tally.eligible_count = eligibleCount;
      tally.quorum_met = eligibleCount > 0
        ? (tally.total / eligibleCount) * 100 >= proposal.quorum
        : false;
    }

    return tally;
  }

  /** Returns the delegate who voted on behalf of userId, or null if user voted directly / no delegation resolves. */
  async getMyDelegationVote(proposalId: string, userId: string): Promise<DelegationVote | null> {
    const proposal = await this.proposalRepo.findOneByOrFail({ id: proposalId });
    const votes = await this.dataSource.getRepository(Vote).find({ where: { proposal_id: proposalId } });
    const allDelegations = await this.dataSource.getRepository(Delegation).find({ where: { organisation_id: proposal.organisation_id } });
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
