import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { CommentReaction } from './comment-reaction.entity';
import { Proposal } from '../proposals/proposal.entity';
import { Membership } from '../organisations/membership.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganisationsService } from '../organisations/organisations.service';

const BODY_MAX = 5000;
const ALLOWED_EMOJIS = ['👍', '👎', '❤️', '🤔'];
const ROLE_RANK: Record<string, number> = { member: 1, moderator: 2, admin: 3 };

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(CommentReaction)
    private readonly reactionRepo: Repository<CommentReaction>,
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(Membership)
    private readonly memberRepo: Repository<Membership>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly orgsService: OrganisationsService,
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

    const result = await this.dataSource.transaction(async (manager) => {
      const comment = manager.create(Comment, { ...data, organisation_id: proposal.organisation_id });
      const saved = await manager.save(comment);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item: saved, txid: parseInt(row.txid, 10) };
    });

    try {
      await this.dataSource.query(
        `INSERT INTO proposal_watches (proposal_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [data.proposal_id, data.author_id],
      );
    } catch { /* non-critical */ }

    await this.notifyMentions(data.body, data.author_id, proposal.organisation_id, data.proposal_id, result.item.id);
    await this.notifyCommented(data.body, data.author_id, proposal, result.item.id);
    return result;
  }

  async edit(id: string, userId: string, body: string): Promise<{ item: Comment; txid: number }> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.author_id !== userId) throw new ForbiddenException('Cannot edit another user\'s comment');
    const trimmed = body.trim();
    if (!trimmed) throw new BadRequestException('Comment body is required');
    if (trimmed.length > BODY_MAX) throw new BadRequestException(`Comment exceeds ${BODY_MAX} characters`);

    const result = await this.dataSource.transaction(async (manager) => {
      await manager.update(Comment, id, { body: trimmed, edited_at: new Date() });
      const item = await manager.findOneByOrFail(Comment, { id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });

    await this.notifyMentions(trimmed, userId, comment.organisation_id, comment.proposal_id, id);
    return result;
  }

  private async notifyMentions(
    body: string,
    authorId: string,
    orgId: string,
    proposalId: string,
    commentId: string,
  ): Promise<void> {
    try {
      const members = await this.orgsService.getMembersWithNames(orgId);
      const mentioned = members.filter(
        (m) => m.userId !== authorId && body.includes(`@${m.name}`),
      );
      if (mentioned.length === 0) return;
      await this.notifications.createMany(
        mentioned.map((m) => ({
          userId: m.userId,
          orgId,
          type: 'comment.mention' as const,
          actorId: authorId,
          targetType: 'proposal',
          targetId: proposalId,
          metadata: { commentId },
        })),
      );
    } catch { /* non-critical */ }
  }

  private async notifyCommented(body: string, authorId: string, proposal: Proposal, commentId: string): Promise<void> {
    try {
      const members = await this.orgsService.getMembersWithNames(proposal.organisation_id);
      const mentionedIds = new Set(members.filter((m) => body.includes(`@${m.name}`)).map((m) => m.userId));
      const votes = await this.dataSource.query<{ user_id: string }[]>(
        'SELECT DISTINCT user_id FROM votes WHERE proposal_id = $1',
        [proposal.id],
      );
      const watchers = await this.dataSource.query<{ user_id: string }[]>(
        'SELECT user_id FROM proposal_watches WHERE proposal_id = $1',
        [proposal.id],
      );
      const interested = new Set<string>();
      if (proposal.author_id && proposal.author_id !== authorId) interested.add(proposal.author_id);
      for (const v of votes) {
        if (v.user_id !== authorId) interested.add(v.user_id);
      }
      for (const w of watchers) {
        if (w.user_id !== authorId) interested.add(w.user_id);
      }
      for (const id of mentionedIds) interested.delete(id);
      if (interested.size === 0) return;
      await this.notifications.createMany(
        [...interested].map((userId) => ({
          userId,
          orgId: proposal.organisation_id,
          type: 'comment.posted' as const,
          actorId: authorId,
          targetType: 'proposal',
          targetId: proposal.id,
          metadata: { commentId, title: proposal.title },
        })),
      );
    } catch { /* non-critical */ }
  }

  async delete(id: string, userId: string): Promise<{ txid: number }> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.author_id !== userId) {
      const m = await this.memberRepo.findOneBy({ organisation_id: comment.organisation_id, user_id: userId });
      if (!m || (ROLE_RANK[m.role] ?? 0) < ROLE_RANK['moderator']) {
        throw new ForbiddenException('Cannot delete another user\'s comment');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(Comment, id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }

  async pin(id: string, actorId: string): Promise<{ item: Comment; txid: number }> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) throw new NotFoundException('Comment not found');
    if (!(await this.isModerator(comment.organisation_id, actorId))) {
      // Also allow the proposal author
      const proposal = await this.proposalRepo.findOneByOrFail({ id: comment.proposal_id });
      if (proposal.author_id !== actorId) throw new ForbiddenException('Only moderators or the proposal author can pin comments');
    }
    // Max 2 pins per proposal
    const pinCount = await this.commentRepo.count({
      where: { proposal_id: comment.proposal_id },
    });
    const pinnedCount = await this.commentRepo
      .createQueryBuilder('c')
      .where('c.proposal_id = :pid AND c.pinned_at IS NOT NULL', { pid: comment.proposal_id })
      .getCount();
    if (pinnedCount >= 2 && !comment.pinned_at) throw new BadRequestException('Maximum 2 comments can be pinned per proposal');

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Comment, id, { pinned_at: new Date() });
      const item = await manager.findOneByOrFail(Comment, { id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async unpin(id: string, actorId: string): Promise<{ item: Comment; txid: number }> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) throw new NotFoundException('Comment not found');
    if (!(await this.isModerator(comment.organisation_id, actorId))) {
      const proposal = await this.proposalRepo.findOneByOrFail({ id: comment.proposal_id });
      if (proposal.author_id !== actorId) throw new ForbiddenException('Only moderators or the proposal author can unpin comments');
    }
    return this.dataSource.transaction(async (manager) => {
      await manager.update(Comment, id, { pinned_at: null });
      const item = await manager.findOneByOrFail(Comment, { id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  private async isModerator(orgId: string, userId: string): Promise<boolean> {
    const m = await this.memberRepo.findOneBy({ organisation_id: orgId, user_id: userId });
    return !!m && (ROLE_RANK[m.role] ?? 0) >= ROLE_RANK['moderator'];
  }

  async hide(id: string, actorId: string, reason: string): Promise<{ item: Comment; txid: number }> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) throw new NotFoundException('Comment not found');
    if (!(await this.isModerator(comment.organisation_id, actorId))) {
      throw new ForbiddenException('Only moderators and admins can hide comments');
    }
    const trimmed = reason?.trim() ?? '';
    if (!trimmed) throw new BadRequestException('A reason is required when hiding a comment');

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Comment, id, { hidden_by: actorId, hidden_reason: trimmed });
      const item = await manager.findOneByOrFail(Comment, { id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async unhide(id: string, actorId: string): Promise<{ item: Comment; txid: number }> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) throw new NotFoundException('Comment not found');
    if (!(await this.isModerator(comment.organisation_id, actorId))) {
      throw new ForbiddenException('Only moderators and admins can unhide comments');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Comment, id, { hidden_by: null, hidden_reason: null });
      const item = await manager.findOneByOrFail(Comment, { id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
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
