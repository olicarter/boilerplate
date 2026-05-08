import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Endorsement } from './endorsement.entity';
import { Proposal } from '../proposals/proposal.entity';
import { Membership } from '../organisations/membership.entity';

@Injectable()
export class EndorsementsService {
  constructor(
    @InjectRepository(Endorsement)
    private readonly endorsementRepo: Repository<Endorsement>,
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(Membership)
    private readonly memberRepo: Repository<Membership>,
    private readonly dataSource: DataSource,
  ) {}

  findByProposal(proposalId: string): Promise<Endorsement[]> {
    return this.endorsementRepo.find({
      where: { proposal_id: proposalId },
      order: { created_at: 'ASC' },
    });
  }

  async endorse(proposalId: string, userId: string): Promise<{ item: Endorsement; txid: number }> {
    const proposal = await this.proposalRepo.findOneByOrFail({ id: proposalId });

    if (proposal.status !== 'draft') {
      throw new BadRequestException('Only draft proposals can be endorsed');
    }
    if (proposal.author_id === userId) {
      throw new BadRequestException('Authors cannot endorse their own proposal');
    }

    const membership = await this.memberRepo.findOneBy({ organisation_id: proposal.organisation_id, user_id: userId });
    if (!membership) throw new ForbiddenException('Not a member of this organisation');

    const existing = await this.endorsementRepo.findOneBy({ proposal_id: proposalId, user_id: userId });
    if (existing) throw new BadRequestException('You have already endorsed this proposal');

    return this.dataSource.transaction(async (manager) => {
      const endorsement = manager.create(Endorsement, {
        id: randomUUID(),
        proposal_id: proposalId,
        organisation_id: proposal.organisation_id,
        user_id: userId,
      });
      const item = await manager.save(endorsement);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async retract(proposalId: string, userId: string): Promise<{ txid: number }> {
    const endorsement = await this.endorsementRepo.findOneBy({ proposal_id: proposalId, user_id: userId });
    if (!endorsement) throw new BadRequestException('You have not endorsed this proposal');

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(Endorsement, endorsement.id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }
}
