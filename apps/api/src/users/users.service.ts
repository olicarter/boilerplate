import { BadRequestException, Injectable } from '@nestjs/common';

const NAME_MAX = 100;
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepo.find({ order: { created_at: 'ASC' } });
  }

  findOne(id: string): Promise<User | null> {
    return this.userRepo.findOneBy({ id });
  }

  async create(data: { id: string; name: string; email: string }): Promise<{ item: User; txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, data);
      const saved = await manager.save(user);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item: saved, txid: parseInt(row.txid, 10) };
    });
  }

  async update(id: string, data: Partial<Pick<User, 'name' | 'email' | 'bio' | 'avatar_url'>>): Promise<{ item: User; txid: number }> {
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new BadRequestException('Name is required');
      if (name.length > NAME_MAX) throw new BadRequestException(`Name must be ${NAME_MAX} characters or fewer`);
    }
    if (data.avatar_url !== undefined && data.avatar_url !== null) {
      // Limit to ~200KB (base64 encoded 128×128 JPEG is typically <20KB)
      if (data.avatar_url.length > 200_000) throw new BadRequestException('Avatar image is too large (max 200KB)');
      if (!data.avatar_url.startsWith('data:image/')) throw new BadRequestException('Invalid image format');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(User, id, data);
      const item = await manager.findOneByOrFail(User, { id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async delete(id: string): Promise<{ txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(User, id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }

  /** Anonymise user PII while preserving structural data (votes, comments) for audit. */
  async anonymize(id: string): Promise<void> {
    const anonymizedEmail = `deleted_${id}@deleted.invalid`;
    await this.dataSource.transaction(async (manager) => {
      // Overwrite PII fields
      await manager.update(User, id, {
        name: 'Deleted User',
        email: anonymizedEmail,
        bio: null,
        avatar_url: null,
        email_verified: false,
        email_verification_token: null,
        notification_preferences: {},
      });
      // Remove authentication credentials
      await manager.query(`DELETE FROM credentials WHERE "userId" = $1`, [id]);
      await manager.query(`DELETE FROM magic_links WHERE "userId" = $1`, [id]);
    });
  }

  async getNotificationPreferences(id: string): Promise<Record<string, boolean>> {
    const user = await this.userRepo.findOneBy({ id });
    return user?.notification_preferences ?? {};
  }

  async updateNotificationPreferences(
    id: string,
    prefs: Record<string, boolean>,
  ): Promise<Record<string, boolean>> {
    await this.userRepo.update(id, { notification_preferences: prefs });
    const user = await this.userRepo.findOneByOrFail({ id });
    return user.notification_preferences;
  }

  async getOrgEmailPreferences(userId: string): Promise<Array<{ org_id: string; org_name: string; org_slug: string; email_notifications_enabled: boolean; email_digest_enabled: boolean }>> {
    return this.dataSource.query(`
      SELECT m.organisation_id AS org_id, o.name AS org_name, o.slug AS org_slug,
             m.email_notifications_enabled, m.email_digest_enabled
      FROM memberships m
      JOIN organisations o ON o.id = m.organisation_id
      WHERE m.user_id = $1 AND m.status = 'approved'
      ORDER BY o.name
    `, [userId]);
  }
}
