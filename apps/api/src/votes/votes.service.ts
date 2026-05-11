import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Vote, VoteChoice } from './vote.entity';
import { Proposal } from '../proposals/proposal.entity';
import { Delegation } from '../delegations/delegation.entity';
import { DelegationsService } from '../delegations/delegations.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(Delegation)
    private readonly delegationRepo: Repository<Delegation>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  findAll(): Promise<Vote[]> {
    return this.voteRepo.find({ order: { created_at: 'ASC' } });
  }

  findByProposal(proposalId: string): Promise<Vote[]> {
    return this.voteRepo.findBy({ proposal_id: proposalId });
  }

  async create(data: {
    id: string;
    proposal_id: string;
    user_id: string;
    choice?: VoteChoice | null;
    option_id?: string | null;
    reason?: string | null;
  }): Promise<{ item: Vote; txid: number }> {
    const proposal = await this.proposalRepo.findOneBy({ id: data.proposal_id });
    if (!proposal || proposal.status !== 'open') {
      throw new BadRequestException('Voting is closed for this proposal');
    }
    if (proposal.deliberation_ends_at && new Date(proposal.deliberation_ends_at) > new Date()) {
      throw new BadRequestException('This proposal is in the deliberation phase — voting opens after deliberation ends');
    }
    if (proposal.proposal_type === 'multiple_choice') {
      if (!data.option_id) throw new BadRequestException('option_id is required for multiple choice proposals');
    } else {
      if (!data.choice) throw new BadRequestException('choice is required');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const vote = manager.create(Vote, {
        id: data.id,
        proposal_id: data.proposal_id,
        user_id: data.user_id,
        choice: data.choice ?? null,
        option_id: data.option_id ?? null,
        reason: data.reason ?? null,
        organisation_id: proposal.organisation_id,
      });
      const saved = await manager.save(vote);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item: saved, txid: parseInt(row.txid, 10) };
    });

    if (proposal.proposal_type !== 'multiple_choice') {
      await this.notifyDelegators(data.user_id, proposal, data.choice!);
    }

    return result;
  }

  private async notifyDelegators(voterId: string, proposal: Proposal, choice: string): Promise<void> {
    try {
      const delegations = await this.delegationRepo.find({
        where: { organisation_id: proposal.organisation_id, delegate_id: voterId },
      });
      const active = DelegationsService.activeDelegations(delegations);
      const topicFiltered = active.filter(
        (d) => d.topic_id === null || d.topic_id === proposal.topic_id,
      );
      if (topicFiltered.length === 0) return;
      await this.notifications.createMany(
        topicFiltered.map((d) => ({
          userId: d.delegator_id,
          orgId: proposal.organisation_id,
          type: 'delegate.voted' as const,
          actorId: voterId,
          targetType: 'proposal',
          targetId: proposal.id,
          metadata: { choice, proposalTitle: proposal.title },
        })),
      );
    } catch { /* non-critical */ }
  }

  async update(id: string, data: { choice?: VoteChoice | null; option_id?: string | null; reason?: string | null }): Promise<{ item: Vote; txid: number }> {
    const vote = await this.voteRepo.findOneBy({ id });
    if (vote) {
      const proposal = await this.proposalRepo.findOneBy({ id: vote.proposal_id });
      if (!proposal || proposal.status !== 'open') {
        throw new BadRequestException('Voting is closed for this proposal');
      }
      if (proposal.deliberation_ends_at && new Date(proposal.deliberation_ends_at) > new Date()) {
        throw new BadRequestException('This proposal is in the deliberation phase — voting opens after deliberation ends');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Vote, id, data);
      const item = await manager.findOneByOrFail(Vote, { id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async delete(id: string): Promise<{ txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(Vote, id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }
}
