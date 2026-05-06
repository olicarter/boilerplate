import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Comment } from './comment.entity';

const BODY_MAX = 5000;

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    private readonly dataSource: DataSource,
  ) {}

  findByProposal(proposalId: string): Promise<Comment[]> {
    return this.commentRepo.find({
      where: { proposal_id: proposalId },
      order: { created_at: 'ASC' },
    });
  }

  async create(data: {
    id: string;
    proposal_id: string;
    author_id: string;
    body: string;
  }): Promise<{ item: Comment; txid: number }> {
    if (!data.body.trim()) throw new BadRequestException('Comment body is required');
    if (data.body.length > BODY_MAX) throw new BadRequestException(`Comment exceeds ${BODY_MAX} characters`);

    return this.dataSource.transaction(async (manager) => {
      const comment = manager.create(Comment, data);
      const saved = await manager.save(comment);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item: saved, txid: parseInt(row.txid, 10) };
    });
  }

  async edit(id: string, userId: string, body: string): Promise<{ item: Comment; txid: number }> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.author_id !== userId) throw new ForbiddenException('Cannot edit another user\'s comment');
    const trimmed = body.trim();
    if (!trimmed) throw new BadRequestException('Comment body is required');
    if (trimmed.length > BODY_MAX) throw new BadRequestException(`Comment exceeds ${BODY_MAX} characters`);

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Comment, id, { body: trimmed, edited_at: new Date() });
      const item = await manager.findOneByOrFail(Comment, { id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async delete(id: string, userId: string): Promise<{ txid: number }> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.author_id !== userId) throw new ForbiddenException('Cannot delete another user\'s comment');

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(Comment, id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }
}
