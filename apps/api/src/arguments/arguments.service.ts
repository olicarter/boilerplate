import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Argument } from './argument.entity';
import { Proposal } from '../proposals/proposal.entity';
import { Membership } from '../organisations/membership.entity';

const BODY_MAX = 2000;
const ROLE_RANK: Record<string, number> = { member: 1, moderator: 2, admin: 3 };

@Injectable()
export class ArgumentsService {
  constructor(
    @InjectRepository(Argument)
    private readonly repo: Repository<Argument>,
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(Membership)
    private readonly memberRepo: Repository<Membership>,
    private readonly dataSource: DataSource,
  ) {}

  findByProposal(proposalId: string): Promise<Argument[]> {
    return this.repo.find({
      where: { proposal_id: proposalId },
      order: { created_at: 'ASC' },
    });
  }

  async create(data: {
    id: string;
    proposal_id: string;
    author_id: string;
    side: 'for' | 'against';
    body: string;
  }): Promise<{ item: Argument; txid: number }> {
    const trimmed = data.body?.trim() ?? '';
    if (!trimmed) throw new BadRequestException('Argument body is required');
    if (trimmed.length > BODY_MAX) throw new BadRequestException(`Argument must be ${BODY_MAX} characters or fewer`);
    if (!['for', 'against'].includes(data.side)) throw new BadRequestException('Side must be "for" or "against"');

    const proposal = await this.proposalRepo.findOneByOrFail({ id: data.proposal_id });
    if (proposal.status !== 'open') throw new BadRequestException('Arguments can only be added to open proposals');

    const membership = await this.memberRepo.findOneBy({ organisation_id: proposal.organisation_id, user_id: data.author_id });
    if (!membership) throw new ForbiddenException('Not a member of this organisation');

    return this.dataSource.transaction(async (manager) => {
      const arg = manager.create(Argument, {
        ...data,
        body: trimmed,
        organisation_id: proposal.organisation_id,
      });
      const item = await manager.save(arg);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async delete(id: string, userId: string): Promise<{ txid: number }> {
    const arg = await this.repo.findOneBy({ id });
    if (!arg) throw new NotFoundException('Argument not found');
    if (arg.author_id !== userId) {
      const m = await this.memberRepo.findOneBy({ organisation_id: arg.organisation_id, user_id: userId });
      if (!m || (ROLE_RANK[m.role] ?? 0) < ROLE_RANK['moderator']) {
        throw new ForbiddenException('Cannot delete another member\'s argument');
      }
    }
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(Argument, id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }
}
