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
import { Membership, MemberRole, MemberStatus } from './membership.entity';
import { Proposal } from '../proposals/proposal.entity';
import { User } from '../users/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';

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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly notifications: NotificationsService,
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
    const memberships = await this.memberRepo.find({ where: { user_id: userId, status: 'approved' as MemberStatus } });
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
    data: Partial<Pick<Organisation, 'name' | 'description' | 'proposal_creation_role' | 'topic_creation_role' | 'default_voting_duration_days' | 'default_threshold' | 'voting_visibility' | 'default_quorum' | 'is_public' | 'veto_role' | 'min_endorsements' | 'require_member_approval' | 'proposal_templates'>>,
    userId: string,
  ): Promise<{ item: Organisation; txid: number }> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, userId, ['admin']);

    const result = await this.dataSource.transaction(async (manager) => {
      const updates: Partial<Organisation> = {};
      if (data.name !== undefined) updates.name = data.name.trim();
      if (data.description !== undefined) updates.description = data.description;
      if (data.proposal_creation_role !== undefined) updates.proposal_creation_role = data.proposal_creation_role;
      if (data.topic_creation_role !== undefined) updates.topic_creation_role = data.topic_creation_role;
      if (data.default_voting_duration_days !== undefined) updates.default_voting_duration_days = data.default_voting_duration_days;
      if (data.default_threshold !== undefined) updates.default_threshold = data.default_threshold;
      if (data.voting_visibility !== undefined) updates.voting_visibility = data.voting_visibility;
      if (data.default_quorum !== undefined) updates.default_quorum = data.default_quorum;
      if (data.is_public !== undefined) updates.is_public = data.is_public;
      if (data.veto_role !== undefined) updates.veto_role = data.veto_role;
      if (data.min_endorsements !== undefined) updates.min_endorsements = data.min_endorsements;
      if (data.require_member_approval !== undefined) updates.require_member_approval = data.require_member_approval;
      if (data.proposal_templates !== undefined) updates.proposal_templates = data.proposal_templates;
      await manager.update(Organisation, org.id, updates);
      const item = await manager.findOneByOrFail(Organisation, { id: org.id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
    this.auditLog.log(org.id, userId, 'org.settings_changed', 'org', org.id, data as Record<string, unknown>);
    return result;
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

    const result = await this.dataSource.transaction(async (manager) => {
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
    this.auditLog.log(orgId, actorId, 'member.added', 'user', targetUserId, { role });
    await this.notifyAdminsAndModerators(orgId, targetUserId, 'member.joined', targetUserId, orgId);
    return result;
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

    const prevRole = membership.role;
    const result = await this.dataSource.transaction(async (manager) => {
      await manager.update(Membership, membership.id, { role });
      const item = await manager.findOneByOrFail(Membership, { id: membership.id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
    this.auditLog.log(orgId, actorId, 'member.role_changed', 'user', targetUserId, { from: prevRole, to: role });
    return result;
  }

  async updateMemberWeight(
    orgId: string,
    targetUserId: string,
    weight: number,
    actorId: string,
  ): Promise<{ item: Membership; txid: number }> {
    await this.requireRole(orgId, actorId, ['admin']);
    if (weight < 1 || weight > 100 || !Number.isInteger(weight)) {
      throw new BadRequestException('Weight must be an integer between 1 and 100');
    }
    const membership = await this.memberRepo.findOneBy({ organisation_id: orgId, user_id: targetUserId });
    if (!membership) throw new NotFoundException('Member not found');

    const result = await this.dataSource.transaction(async (manager) => {
      await manager.update(Membership, membership.id, { weight });
      const item = await manager.findOneByOrFail(Membership, { id: membership.id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
    this.auditLog.log(orgId, actorId, 'member.weight_changed', 'user', targetUserId, { weight });
    return result;
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

    const result = await this.dataSource.transaction(async (manager) => {
      await manager.delete(Membership, membership.id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
    this.auditLog.log(orgId, actorId, 'member.removed', 'user', targetUserId, { role: membership.role });
    return result;
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

  async joinPublic(slug: string, userId: string): Promise<{ item: Membership; txid: number }> {
    const org = await this.findBySlug(slug);
    if (!org.is_public) throw new ForbiddenException('This organisation is not open to the public');
    const existing = await this.memberRepo.findOneBy({ organisation_id: org.id, user_id: userId });
    if (existing) return { item: existing, txid: 0 };
    const status: MemberStatus = org.require_member_approval ? 'pending' : 'approved';
    return this.dataSource.transaction(async (manager) => {
      const membership = manager.create(Membership, {
        id: randomUUID(),
        organisation_id: org.id,
        user_id: userId,
        role: 'member',
        invited_by: null,
        status,
      });
      const item = await manager.save(membership);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async approveMember(slug: string, targetUserId: string, actorId: string): Promise<{ item: Membership; txid: number }> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, actorId, ['admin', 'moderator']);
    const membership = await this.memberRepo.findOneBy({ organisation_id: org.id, user_id: targetUserId });
    if (!membership) throw new NotFoundException('Member not found');
    if (membership.status !== 'pending') throw new BadRequestException('Member is not pending approval');
    const result = await this.dataSource.transaction(async (manager) => {
      await manager.update(Membership, membership.id, { status: 'approved' });
      const item = await manager.findOneByOrFail(Membership, { id: membership.id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
    this.auditLog.log(org.id, actorId, 'member.approved', 'user', targetUserId, {});
    await this.notifyAdminsAndModerators(org.id, targetUserId, 'member.joined', targetUserId, org.id);
    return result;
  }

  async rejectMember(slug: string, targetUserId: string, actorId: string): Promise<{ txid: number }> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, actorId, ['admin', 'moderator']);
    const membership = await this.memberRepo.findOneBy({ organisation_id: org.id, user_id: targetUserId });
    if (!membership) throw new NotFoundException('Member not found');
    if (membership.status !== 'pending') throw new BadRequestException('Member is not pending approval');
    const result = await this.dataSource.transaction(async (manager) => {
      await manager.delete(Membership, membership.id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
    this.auditLog.log(org.id, actorId, 'member.rejected', 'user', targetUserId, {});
    return result;
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

  private async notifyAdminsAndModerators(
    orgId: string,
    excludeUserId: string,
    type: Parameters<NotificationsService['create']>[0]['type'],
    actorId: string,
    targetId: string,
  ): Promise<void> {
    try {
      const members = await this.memberRepo.find({ where: { organisation_id: orgId, status: 'approved' as MemberStatus } });
      const recipients = members
        .filter((m) => (m.role === 'admin' || m.role === 'moderator') && m.user_id !== excludeUserId)
        .map((m) => ({ userId: m.user_id, orgId, type, actorId, targetType: 'user', targetId }));
      await this.notifications.createMany(recipients);
    } catch { /* non-critical */ }
  }

  async requireMember(orgId: string, userId: string): Promise<Membership> {
    const m = await this.memberRepo.findOneBy({ organisation_id: orgId, user_id: userId, status: 'approved' as MemberStatus });
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

  async searchMembers(slug: string, q: string): Promise<{ id: string; name: string }[]> {
    const org = await this.findBySlug(slug);
    const members = await this.memberRepo.find({ where: { organisation_id: org.id, status: 'approved' as MemberStatus } });
    const userIds = members.map((m) => m.user_id);
    if (userIds.length === 0) return [];
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: userIds })
      .andWhere('u.name ILIKE :q', { q: `${q.replace(/%/g, '\\%')}%` })
      .orderBy('u.name', 'ASC')
      .limit(10)
      .getMany();
    return users.map((u) => ({ id: u.id, name: u.name }));
  }

  async getMembersWithNames(orgId: string): Promise<{ userId: string; name: string }[]> {
    const members = await this.memberRepo.find({ where: { organisation_id: orgId, status: 'approved' as MemberStatus } });
    if (members.length === 0) return [];
    const userIds = members.map((m) => m.user_id);
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: userIds })
      .getMany();
    return users.map((u) => ({ userId: u.id, name: u.name }));
  }

  async getPublicResults(slug: string): Promise<{ org: Organisation; proposals: Proposal[] }> {
    const org = await this.findBySlug(slug);
    if (!org.is_public) throw new ForbiddenException('This organisation does not have a public results page');
    const proposals = await this.dataSource.getRepository(Proposal).find({
      where: [
        { organisation_id: org.id, status: 'closed' as any },
        { organisation_id: org.id, status: 'withdrawn' as any },
      ],
      order: { closed_at: 'DESC', created_at: 'DESC' },
    });
    return { org, proposals };
  }
}
