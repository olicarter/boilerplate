import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { ApiKey } from './api-key.entity';
import { Membership } from '../organisations/membership.entity';
import { Organisation } from '../organisations/organisation.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
    private readonly dataSource: DataSource,
  ) {}

  private async requireAdmin(orgSlug: string, userId: string): Promise<Organisation> {
    const org = await this.dataSource.getRepository(Organisation).findOneByOrFail({ slug: orgSlug });
    const membership = await this.dataSource.getRepository(Membership).findOneBy({ organisation_id: org.id, user_id: userId, status: 'approved' as any });
    if (!membership || !['admin'].includes(membership.role)) {
      throw new ForbiddenException('Only org admins can manage API keys');
    }
    return org;
  }

  async list(orgSlug: string, userId: string): Promise<Omit<ApiKey, 'key_hash'>[]> {
    const org = await this.requireAdmin(orgSlug, userId);
    const keys = await this.repo.find({
      where: { organisation_id: org.id, revoked_at: undefined as any },
      order: { created_at: 'DESC' },
    });
    return keys.filter((k) => !k.revoked_at).map(({ key_hash: _, ...rest }) => rest);
  }

  async create(orgSlug: string, userId: string, name: string): Promise<{ key: string; record: Omit<ApiKey, 'key_hash'> }> {
    const org = await this.requireAdmin(orgSlug, userId);
    const rawKey = `rk_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPreview = rawKey.slice(0, 12) + '…';
    const record = this.repo.create({
      organisation_id: org.id,
      name,
      key_hash: keyHash,
      key_preview: keyPreview,
      created_by_user_id: userId,
    });
    await this.repo.save(record);
    const { key_hash: _, ...rest } = record;
    return { key: rawKey, record: rest };
  }

  async revoke(orgSlug: string, keyId: string, userId: string): Promise<void> {
    const org = await this.requireAdmin(orgSlug, userId);
    const key = await this.repo.findOneByOrFail({ id: keyId, organisation_id: org.id });
    key.revoked_at = new Date();
    await this.repo.save(key);
  }

  /** Validate a raw API key. Returns the org_id if valid, null otherwise. */
  async validateKey(rawKey: string): Promise<{ org_id: string; key_id: string } | null> {
    if (!rawKey.startsWith('rk_')) return null;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const key = await this.repo.findOneBy({ key_hash: keyHash });
    if (!key || key.revoked_at) return null;
    // Update last_used_at without blocking
    this.repo.update(key.id, { last_used_at: new Date() }).catch(() => {});
    return { org_id: key.organisation_id, key_id: key.id };
  }
}
