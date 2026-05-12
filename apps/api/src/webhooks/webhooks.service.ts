import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHmac, randomBytes } from 'crypto';
import { WebhookEndpoint } from './webhook-endpoint.entity';

export const WEBHOOK_EVENTS = [
  'proposal.opened',
  'proposal.closed',
  'vote.cast',
  'member.joined',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

type PublicEndpoint = Omit<WebhookEndpoint, 'secret'>;

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(WebhookEndpoint)
    private readonly repo: Repository<WebhookEndpoint>,
    private readonly dataSource: DataSource,
  ) {}

  private async resolveOrgId(slug: string): Promise<string> {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `SELECT id FROM organisations WHERE slug = $1`,
      [slug],
    );
    if (!rows[0]) throw new NotFoundException('Organisation not found');
    return rows[0].id;
  }

  private async requireAdmin(orgId: string, userId: string): Promise<void> {
    const rows = await this.dataSource.query<{ role: string }[]>(
      `SELECT role FROM memberships WHERE organisation_id = $1 AND user_id = $2 AND status = 'approved'`,
      [orgId, userId],
    );
    if (!rows[0] || rows[0].role !== 'admin') throw new ForbiddenException('Admin access required');
  }

  async listBySlug(slug: string, userId: string): Promise<PublicEndpoint[]> {
    const orgId = await this.resolveOrgId(slug);
    await this.requireAdmin(orgId, userId);
    const rows = await this.repo.find({ where: { org_id: orgId }, order: { created_at: 'ASC' } });
    return rows.map(({ secret: _s, ...rest }) => rest);
  }

  async createBySlug(slug: string, userId: string, url: string, events: string[]): Promise<PublicEndpoint & { secret: string }> {
    const orgId = await this.resolveOrgId(slug);
    await this.requireAdmin(orgId, userId);
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      throw new NotFoundException('URL must start with http:// or https://');
    }
    const secret = randomBytes(24).toString('hex');
    const endpoint = this.repo.create({ org_id: orgId, url, events, secret });
    return this.repo.save(endpoint);
  }

  async deleteBySlug(id: string, slug: string, userId: string): Promise<void> {
    const orgId = await this.resolveOrgId(slug);
    await this.requireAdmin(orgId, userId);
    await this.repo.delete({ id, org_id: orgId });
  }

  async dispatch(orgId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
    const endpoints = await this.repo.find({ where: { org_id: orgId, active: true } });
    const matching = endpoints.filter((e) => e.events.length === 0 || e.events.includes(event));
    if (matching.length === 0) return;

    const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), org_id: orgId, data });

    await Promise.allSettled(
      matching.map(async (endpoint) => {
        const sig = createHmac('sha256', endpoint.secret).update(payload).digest('hex');
        await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Ripple-Signature': `sha256=${sig}`,
            'X-Ripple-Event': event,
          },
          body: payload,
          signal: AbortSignal.timeout(10_000),
        });
      }),
    );
  }
}
