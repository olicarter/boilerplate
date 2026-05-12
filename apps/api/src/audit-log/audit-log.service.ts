import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntry } from './audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntry)
    private readonly repo: Repository<AuditLogEntry>,
  ) {}

  log(
    orgId: string,
    actorId: string | null,
    action: string,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
  ): void {
    // Fire-and-forget: don't await so callers aren't slowed down
    this.repo.save(
      this.repo.create({ org_id: orgId, actor_id: actorId, action, target_type: targetType ?? null, target_id: targetId ?? null, metadata: metadata ?? {} }),
    ).catch(() => { /* never block callers on audit failures */ });
  }

  async list(orgId: string, page = 1, pageSize = 50): Promise<{ items: AuditLogEntry[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const [items, total] = await this.repo.findAndCount({
      where: { org_id: orgId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
