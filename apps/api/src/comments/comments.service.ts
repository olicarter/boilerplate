import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { CommentReaction } from './comment-reaction.entity';
import { Proposal } from '../proposals/proposal.entity';

const BODY_MAX = 5000;
const ALLOWED_EMOJIS = ['👍', '👎', '❤️', '🤔'];

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(CommentReaction)
    private readonly reactionRepo: Repository<CommentReaction>,
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
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

    const proposal = await this.proposalRepo.findOneByOrFail({ id: data.proposal_id });

    return this.dataSource.transaction(async (manager) => {
      const comment = manager.create(Comment, { ...data, organisation_id: proposal.organisation_id });
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

  async toggleReaction(commentId: string, userId: string, emoji: string): Promise<{ item?: CommentReaction; deleted?: boolean; txid: number }> {
    if (!ALLOWED_EMOJIS.includes(emoji)) {
      throw new BadRequestException(`Emoji must be one of: ${ALLOWED_EMOJIS.join(' ')}`);
    }
    const comment = await this.commentRepo.findOneBy({ id: commentId });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.reactionRepo.findOneBy({ comment_id: commentId, user_id: userId, emoji });

    return this.dataSource.transaction(async (manager) => {
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      const txid = parseInt(row.txid, 10);

      if (existing) {
        await manager.delete(CommentReaction, existing.id);
        return { deleted: true, txid };
      }

      const reaction = manager.create(CommentReaction, {
        id: randomUUID(),
        comment_id: commentId,
        user_id: userId,
        emoji,
        organisation_id: comment.organisation_id,
      });
      const item = await manager.save(reaction);
      return { item, txid };
    });
  }
}
