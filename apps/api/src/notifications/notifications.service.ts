import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Notification, NotificationType } from './notification.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  private readonly appUrl: string;

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {
    this.appUrl = process.env.APP_URL ?? 'http://localhost:5173';
  }

  private proposalUrl(orgSlug: string, proposalId: string): string {
    return `${this.appUrl}/orgs/${orgSlug}/proposals/${proposalId}`;
  }

  private async sendEmailForNotification(
    userEmail: string,
    type: NotificationType,
    orgId: string | null | undefined,
    targetId: string | null | undefined,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      const proposalTitle = String(metadata.proposalTitle ?? metadata.title ?? '');

      let orgSlug = String(metadata.orgSlug ?? '');
      if (!orgSlug && orgId) {
        const rows: { slug: string }[] = await this.dataSource.query(`SELECT slug FROM organisations WHERE id = $1`, [orgId]);
        orgSlug = rows[0]?.slug ?? '';
      }

      const proposalId = String(targetId ?? metadata.proposalId ?? '');
      const url = this.proposalUrl(orgSlug, proposalId);

      if (type === 'proposal.opened') {
        await this.emailService.sendProposalOpen(userEmail, proposalTitle, url);
      } else if (type === 'proposal.closed') {
        const outcome = String(metadata.outcome ?? 'closed');
        await this.emailService.sendProposalClosed(userEmail, proposalTitle, outcome, url);
      } else if (type === 'delegate.voted') {
        const delegateName = String(metadata.delegateName ?? metadata.actorName ?? 'Your delegate');
        const choice = String(metadata.choice ?? '');
        await this.emailService.sendDelegateVoted(userEmail, delegateName, proposalTitle, choice, url);
      } else if (type === 'proposal.vote_reminder') {
        await this.emailService.sendVoteReminder(userEmail, proposalTitle, url, null);
      }
    } catch { /* email failures are non-critical */ }
  }

  private async allowedByPreferences(
    items: { userId: string; type: NotificationType }[],
  ): Promise<boolean[]> {
    if (items.length === 0) return [];
    const userIds = [...new Set(items.map((n) => n.userId))];
    const rows: { id: string; notification_preferences: Record<string, boolean> }[] =
      await this.dataSource.query(
        `SELECT id, notification_preferences FROM users WHERE id = ANY($1)`,
        [userIds],
      );
    const prefMap = Object.fromEntries(rows.map((r) => [r.id, r.notification_preferences ?? {}]));
    return items.map((n) => {
      const prefs = prefMap[n.userId] ?? {};
      return prefs[n.type] !== false;
    });
  }

  private readonly EMAIL_NOTIFICATION_TYPES: Set<NotificationType> = new Set([
    'proposal.opened', 'proposal.closed', 'delegate.voted', 'proposal.vote_reminder',
  ]);

  async create(data: {
    userId: string;
    orgId?: string | null;
    type: NotificationType;
    actorId?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const [allowed] = await this.allowedByPreferences([{ userId: data.userId, type: data.type }]);
    if (!allowed) return;
    await this.repo.save(
      this.repo.create({
        id: randomUUID(),
        user_id: data.userId,
        org_id: data.orgId ?? null,
        type: data.type,
        actor_id: data.actorId ?? null,
        target_type: data.targetType ?? null,
        target_id: data.targetId ?? null,
        metadata: data.metadata ?? {},
      }),
    );
    if (this.EMAIL_NOTIFICATION_TYPES.has(data.type)) {
      const rows: { email: string }[] = await this.dataSource.query(`SELECT email FROM users WHERE id = $1`, [data.userId]);
      if (rows[0]?.email) {
        await this.sendEmailForNotification(rows[0].email, data.type, data.orgId, data.targetId, data.metadata ?? {});
      }
    }
  }

  async createMany(notifications: Parameters<typeof this.create>[0][]): Promise<void> {
    if (notifications.length === 0) return;
    const checks = await this.allowedByPreferences(
      notifications.map((n) => ({ userId: n.userId, type: n.type })),
    );
    const filtered = notifications.filter((_, i) => checks[i]);
    if (filtered.length === 0) return;
    await this.repo.save(
      filtered.map((n) =>
        this.repo.create({
          id: randomUUID(),
          user_id: n.userId,
          org_id: n.orgId ?? null,
          type: n.type,
          actor_id: n.actorId ?? null,
          target_type: n.targetType ?? null,
          target_id: n.targetId ?? null,
          metadata: n.metadata ?? {},
        }),
      ),
    );
    const emailBatch = filtered.filter((n) => this.EMAIL_NOTIFICATION_TYPES.has(n.type));
    if (emailBatch.length > 0) {
      const userIds = [...new Set(emailBatch.map((n) => n.userId))];
      const rows: { id: string; email: string }[] = await this.dataSource.query(
        `SELECT id, email FROM users WHERE id = ANY($1)`, [userIds],
      );
      const emailMap = Object.fromEntries(rows.map((r) => [r.id, r.email]));
      await Promise.all(
        emailBatch.map((n) => {
          const email = emailMap[n.userId];
          return email ? this.sendEmailForNotification(email, n.type, n.orgId, n.targetId, n.metadata ?? {}) : Promise.resolve();
        }),
      );
    }
  }

  async listForUser(userId: string, limit = 30): Promise<Notification[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { user_id: userId, read_at: IsNull() } });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.repo.update({ id, user_id: userId }, { read_at: new Date() });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ read_at: new Date() })
      .where('user_id = :userId AND read_at IS NULL', { userId })
      .execute();
  }
}
