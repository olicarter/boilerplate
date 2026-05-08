import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Veto } from './veto.entity';
import { Proposal } from '../proposals/proposal.entity';
import { Organisation } from '../organisations/organisation.entity';
import { Membership } from '../organisations/membership.entity';

const ROLE_RANK: Record<string, number> = { member: 1, moderator: 2, admin: 3 };

@Injectable()
export class VetoesService {
  constructor(
    @InjectRepository(Veto)
    private readonly vetoRepo: Repository<Veto>,
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,
    @InjectRepository(Membership)
    private readonly memberRepo: Repository<Membership>,
    private readonly dataSource: DataSource,
  ) {}

  findByProposal(proposalId: string): Promise<Veto[]> {
    return this.vetoRepo.find({ where: { proposal_id: proposalId }, order: { created_at: 'ASC' } });
  }

  async cast(proposalId: string, actorId: string, reason: string): Promise<{ item: Veto; txid: number }> {
    const trimmed = reason?.trim() ?? '';
    if (!trimmed) throw new BadRequestException('A reason is required to cast a veto');

    const proposal = await this.proposalRepo.findOneByOrFail({ id: proposalId });
    if (proposal.status !== 'open') throw new BadRequestException('Vetoes can only be cast on open proposals');

    const org = await this.orgRepo.findOneByOrFail({ id: proposal.organisation_id });
    const m = await this.memberRepo.findOneBy({ organisation_id: org.id, user_id: actorId });
    if (!m) throw new ForbiddenException('Not a member of this organisation');
    if ((ROLE_RANK[m.role] ?? 0) < (ROLE_RANK[org.veto_role] ?? ROLE_RANK['admin'])) {
      throw new ForbiddenException(`Only ${org.veto_role}s and above can cast a veto`);
    }

    const existing = await this.vetoRepo.findOneBy({ proposal_id: proposalId, author_id: actorId });
    if (existing) throw new BadRequestException('You have already cast a veto on this proposal');

    return this.dataSource.transaction(async (manager) => {
      const veto = manager.create(Veto, {
        id: randomUUID(),
        proposal_id: proposalId,
        organisation_id: org.id,
        author_id: actorId,
        reason: trimmed,
      });
      const item = await manager.save(veto);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async retract(vetoId: string, actorId: string): Promise<{ txid: number }> {
    const veto = await this.vetoRepo.findOneBy({ id: vetoId });
    if (!veto) throw new NotFoundException('Veto not found');
    if (veto.author_id !== actorId) {
      // Admins can retract any veto
      const m = await this.memberRepo.findOneBy({ organisation_id: veto.organisation_id, user_id: actorId });
      if (!m || m.role !== 'admin') throw new ForbiddenException('Only the veto author or an admin can retract a veto');
    }
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(Veto, vetoId);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }
}
