import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Notification, NotificationType } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(data: {
    userId: string;
    orgId?: string | null;
    type: NotificationType;
    actorId?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
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
  }

  async createMany(notifications: Parameters<typeof this.create>[0][]): Promise<void> {
    if (notifications.length === 0) return;
    await this.repo.save(
      notifications.map((n) =>
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
