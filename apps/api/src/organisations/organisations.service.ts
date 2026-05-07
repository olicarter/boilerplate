import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Organisation } from './organisation.entity';
import { Membership, MemberRole } from './membership.entity';

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class OrganisationsService {
  constructor(
    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,
    @InjectRepository(Membership)
    private readonly memberRepo: Repository<Membership>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<Organisation[]> {
    return this.orgRepo.find({ order: { created_at: 'ASC' } });
  }

  async findBySlug(slug: string): Promise<Organisation> {
    const org = await this.orgRepo.findOneBy({ slug });
    if (!org) throw new NotFoundException(`Organisation "${slug}" not found`);
    return org;
  }

  async findForUser(userId: string): Promise<Organisation[]> {
    const memberships = await this.memberRepo.find({ where: { user_id: userId } });
    if (memberships.length === 0) return [];
    const orgIds = memberships.map((m) => m.organisation_id);
    return this.orgRepo
      .createQueryBuilder('o')
      .where('o.id IN (:...ids)', { ids: orgIds })
      .orderBy('o.created_at', 'ASC')
      .getMany();
  }

  async create(
    data: { name: string; slug?: string; description?: string },
    creatorId: string,
  ): Promise<{ item: Organisation; txid: number }> {
    const slug = data.slug ? toSlug(data.slug) : toSlug(data.name);
    if (!slug) throw new BadRequestException('Invalid organisation name or slug');
    const existing = await this.orgRepo.findOneBy({ slug });
    if (existing) throw new ConflictException(`Slug "${slug}" is already taken`);

    return this.dataSource.transaction(async (manager) => {
      const org = manager.create(Organisation, {
        id: randomUUID(),
        name: data.name.trim(),
        slug,
        description: data.description?.trim() ?? '',
      });
      const saved = await manager.save(org);

      const membership = manager.create(Membership, {
        id: randomUUID(),
        organisation_id: saved.id,
        user_id: creatorId,
        role: 'admin',
      });
      await manager.save(membership);

      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item: saved, txid: parseInt(row.txid, 10) };
    });
  }

  async update(
    slug: string,
    data: Partial<Pick<Organisation, 'name' | 'description' | 'proposal_creation_role' | 'topic_creation_role' | 'default_voting_duration_days' | 'default_threshold' | 'voting_visibility' | 'default_quorum'>>,
    userId: string,
  ): Promise<{ item: Organisation; txid: number }> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, userId, ['admin']);

    return this.dataSource.transaction(async (manager) => {
      const updates: Partial<Organisation> = {};
      if (data.name !== undefined) updates.name = data.name.trim();
      if (data.description !== undefined) updates.description = data.description;
      if (data.proposal_creation_role !== undefined) updates.proposal_creation_role = data.proposal_creation_role;
      if (data.topic_creation_role !== undefined) updates.topic_creation_role = data.topic_creation_role;
      if (data.default_voting_duration_days !== undefined) updates.default_voting_duration_days = data.default_voting_duration_days;
      if (data.default_threshold !== undefined) updates.default_threshold = data.default_threshold;
      if (data.voting_visibility !== undefined) updates.voting_visibility = data.voting_visibility;
      if (data.default_quorum !== undefined) updates.default_quorum = data.default_quorum;
      await manager.update(Organisation, org.id, updates);
      const item = await manager.findOneByOrFail(Organisation, { id: org.id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async delete(slug: string, userId: string): Promise<{ txid: number }> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, userId, ['admin']);

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(Organisation, org.id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }

  // --- Membership ---

  async listMembers(orgId: string): Promise<Membership[]> {
    return this.memberRepo.find({
      where: { organisation_id: orgId },
      order: { joined_at: 'ASC' },
    });
  }

  async getMembership(orgId: string, userId: string): Promise<Membership | null> {
    return this.memberRepo.findOneBy({ organisation_id: orgId, user_id: userId });
  }

  async addMember(
    orgId: string,
    targetUserId: string,
    role: MemberRole,
    actorId: string,
  ): Promise<{ item: Membership; txid: number }> {
    await this.requireRole(orgId, actorId, ['admin', 'moderator']);
    if (role === 'admin') await this.requireRole(orgId, actorId, ['admin']);

    const existing = await this.memberRepo.findOneBy({ organisation_id: orgId, user_id: targetUserId });
    if (existing) throw new ConflictException('User is already a member');

    return this.dataSource.transaction(async (manager) => {
      const membership = manager.create(Membership, {
        id: randomUUID(),
        organisation_id: orgId,
        user_id: targetUserId,
        role,
        invited_by: actorId,
      });
      const item = await manager.save(membership);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async updateMemberRole(
    orgId: string,
    targetUserId: string,
    role: MemberRole,
    actorId: string,
  ): Promise<{ item: Membership; txid: number }> {
    await this.requireRole(orgId, actorId, ['admin']);
    const membership = await this.memberRepo.findOneBy({ organisation_id: orgId, user_id: targetUserId });
    if (!membership) throw new NotFoundException('Member not found');

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Membership, membership.id, { role });
      const item = await manager.findOneByOrFail(Membership, { id: membership.id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async removeMember(
    orgId: string,
    targetUserId: string,
    actorId: string,
  ): Promise<{ txid: number }> {
    if (targetUserId !== actorId) {
      await this.requireRole(orgId, actorId, ['admin']);
    }
    const membership = await this.memberRepo.findOneBy({ organisation_id: orgId, user_id: targetUserId });
    if (!membership) throw new NotFoundException('Member not found');

    // Prevent removing the last admin
    if (membership.role === 'admin') {
      const adminCount = await this.memberRepo.count({ where: { organisation_id: orgId, role: 'admin' } });
      if (adminCount <= 1) throw new ForbiddenException('Cannot remove the last admin');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(Membership, membership.id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }

  // --- Invite token ---

  async generateInviteToken(slug: string, actorId: string): Promise<{ item: Organisation; txid: number }> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, actorId, ['admin']);
    return this.dataSource.transaction(async (manager) => {
      const token = randomUUID();
      await manager.update(Organisation, org.id, { invite_token: token });
      const item = await manager.findOneByOrFail(Organisation, { id: org.id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async revokeInviteToken(slug: string, actorId: string): Promise<{ item: Organisation; txid: number }> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, actorId, ['admin']);
    return this.dataSource.transaction(async (manager) => {
      await manager.update(Organisation, org.id, { invite_token: null });
      const item = await manager.findOneByOrFail(Organisation, { id: org.id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async joinViaToken(slug: string, userId: string, token: string): Promise<{ item: Membership; txid: number }> {
    const org = await this.findBySlug(slug);
    if (!org.invite_token || org.invite_token !== token) {
      throw new ForbiddenException('Invalid or expired invite link');
    }
    const existing = await this.memberRepo.findOneBy({ organisation_id: org.id, user_id: userId });
    if (existing) return { item: existing, txid: 0 };
    return this.dataSource.transaction(async (manager) => {
      const membership = manager.create(Membership, {
        id: randomUUID(),
        organisation_id: org.id,
        user_id: userId,
        role: 'member',
      });
      const item = await manager.save(membership);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async transferOwnership(
    slug: string,
    toUserId: string,
    actorId: string,
  ): Promise<{ txid: number }> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, actorId, ['admin']);
    if (toUserId === actorId) throw new BadRequestException('Cannot transfer ownership to yourself');
    const target = await this.memberRepo.findOneBy({ organisation_id: org.id, user_id: toUserId });
    if (!target) throw new NotFoundException('Target user is not a member of this organisation');

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Membership, { organisation_id: org.id, user_id: toUserId }, { role: 'admin' });
      await manager.update(Membership, { organisation_id: org.id, user_id: actorId }, { role: 'member' });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }

  async requireMember(orgId: string, userId: string): Promise<Membership> {
    const m = await this.memberRepo.findOneBy({ organisation_id: orgId, user_id: userId });
    if (!m) throw new ForbiddenException('You are not a member of this organisation');
    return m;
  }

  async requireRole(orgId: string, userId: string, roles: MemberRole[]): Promise<Membership> {
    const m = await this.requireMember(orgId, userId);
    if (!roles.includes(m.role)) {
      throw new ForbiddenException(`Requires role: ${roles.join(' or ')}`);
    }
    return m;
  }
}
