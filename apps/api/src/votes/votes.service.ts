import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Vote, VoteChoice } from './vote.entity';
import { Proposal } from '../proposals/proposal.entity';

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    private readonly dataSource: DataSource,
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
    choice: VoteChoice;
  }): Promise<{ item: Vote; txid: number }> {
    const proposal = await this.proposalRepo.findOneBy({ id: data.proposal_id });
    if (!proposal || proposal.status !== 'open') {
      throw new BadRequestException('Voting is closed for this proposal');
    }

    return this.dataSource.transaction(async (manager) => {
      const vote = manager.create(Vote, data);
      const saved = await manager.save(vote);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item: saved, txid: parseInt(row.txid, 10) };
    });
  }

  async update(id: string, data: Pick<Vote, 'choice'>): Promise<{ item: Vote; txid: number }> {
    const vote = await this.voteRepo.findOneBy({ id });
    if (vote) {
      const proposal = await this.proposalRepo.findOneBy({ id: vote.proposal_id });
      if (!proposal || proposal.status !== 'open') {
        throw new BadRequestException('Voting is closed for this proposal');
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
