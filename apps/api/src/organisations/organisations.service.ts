import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID, randomBytes } from 'crypto';
import { Organisation } from './organisation.entity';
import { Membership, MemberRole, MemberStatus } from './membership.entity';
import { OrgInvite } from './org-invite.entity';
import { Proposal } from '../proposals/proposal.entity';
import { Vote } from '../votes/vote.entity';
import { User } from '../users/user.entity';
import { Topic } from '../topics/topic.entity';
import { Delegation } from '../delegations/delegation.entity';
import { DelegationsService } from '../delegations/delegations.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

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
    @InjectRepository(OrgInvite)
    private readonly inviteRepo: Repository<OrgInvite>,
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  async findAll(): Promise<Organisation[]> {
    return this.orgRepo.find({ order: { created_at: 'ASC' } });
  }

  async getStats(): Promise<{ orgs: number; members: number; votes: number }> {
    const [orgs, members, votes] = await Promise.all([
      this.orgRepo.count(),
      this.memberRepo.count({ where: { status: 'approved' as MemberStatus } }),
      this.dataSource.getRepository(Vote).count(),
    ]);
    return { orgs, members, votes };
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
    data: Partial<Pick<Organisation, 'name' | 'description' | 'proposal_creation_role' | 'topic_creation_role' | 'default_voting_duration_days' | 'default_threshold' | 'voting_visibility' | 'default_quorum' | 'is_public' | 'veto_role' | 'min_endorsements' | 'require_member_approval' | 'proposal_templates' | 'allowed_email_domains'>>,
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
      if (data.allowed_email_domains !== undefined) updates.allowed_email_domains = data.allowed_email_domains;
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

  private async checkEmailDomain(org: Organisation, userId: string): Promise<void> {
    if (!org.allowed_email_domains || org.allowed_email_domains.length === 0) return;
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new ForbiddenException('User not found');
    const domain = user.email.split('@')[1]?.toLowerCase();
    if (!org.allowed_email_domains.map((d) => d.toLowerCase()).includes(domain)) {
      throw new ForbiddenException(
        `Your email domain (@${domain}) is not allowed for this organisation. Allowed domains: ${org.allowed_email_domains.join(', ')}`,
      );
    }
  }

  async joinViaToken(slug: string, userId: string, token: string): Promise<{ item: Membership; txid: number }> {
    const org = await this.findBySlug(slug);
    if (!org.invite_token || org.invite_token !== token) {
      throw new ForbiddenException('Invalid or expired invite link');
    }
    await this.checkEmailDomain(org, userId);
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
    await this.checkEmailDomain(org, userId);
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

  async getDelegationWeights(slug: string): Promise<Array<{ user_id: string; carried_weight: number }>> {
    const org = await this.findBySlug(slug);
    const memberships = await this.memberRepo.find({ where: { organisation_id: org.id, status: 'approved' as MemberStatus } });
    const ROLE_WEIGHT: Record<string, number> = { admin: 3, moderator: 2, member: 1, observer: 0 };
    const memberWeight = new Map<string, number>(memberships.map((m) => {
      const w = org.weight_mode === 'by_role' ? (ROLE_WEIGHT[m.role] ?? 1) : ((m as any).weight ?? 1);
      return [m.user_id, w];
    }));

    const allDelegations = await this.dataSource.getRepository(Delegation).find({ where: { organisation_id: org.id } });
    const active = DelegationsService.activeDelegations(allDelegations);

    const carriedWeight = new Map<string, number>(memberships.map((m) => [m.user_id, memberWeight.get(m.user_id) ?? 1]));
    for (const d of active) {
      const delegatorWeight = memberWeight.get(d.delegator_id) ?? 1;
      const current = carriedWeight.get(d.delegate_id) ?? 0;
      carriedWeight.set(d.delegate_id, current + delegatorWeight);
    }

    return [...carriedWeight.entries()].map(([user_id, carried_weight]) => ({ user_id, carried_weight }));
  }

  async getAnalytics(slug: string, actorId: string): Promise<{
    totalProposals: number;
    openProposals: number;
    closedProposals: number;
    totalVotes: number;
    totalMembers: number;
    participationRate: number;
    avgVotesPerProposal: number;
    proposalsByMonth: Array<{ month: string; count: number }>;
    topVoters: Array<{ user_id: string; name: string; voteCount: number }>;
    proposalOutcomes: { passed: number; failed: number; withdrawn: number };
  }> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, actorId, ['admin', 'moderator']);

    const [proposals, members, votes] = await Promise.all([
      this.dataSource.getRepository(Proposal).find({ where: { organisation_id: org.id } }),
      this.memberRepo.find({ where: { organisation_id: org.id, status: 'approved' as any } }),
      this.dataSource.getRepository(Vote).find({ where: { organisation_id: org.id } }),
    ]);

    const totalProposals = proposals.length;
    const openProposals = proposals.filter((p) => p.status === 'open').length;
    const closedProposals = proposals.filter((p) => p.status === 'closed').length;
    const totalVotes = votes.length;
    const totalMembers = members.length;

    const closedWithVotes = proposals.filter((p) => p.status === 'closed' && p.proposal_type !== 'discussion');
    const votersPerProposal = closedWithVotes.map((p) =>
      new Set(votes.filter((v) => v.proposal_id === p.id).map((v) => v.user_id)).size,
    );
    const avgVotersPerProposal = votersPerProposal.length > 0
      ? votersPerProposal.reduce((a, b) => a + b, 0) / votersPerProposal.length
      : 0;
    const participationRate = totalMembers > 0 ? Math.round((avgVotersPerProposal / totalMembers) * 100) : 0;
    const avgVotesPerProposal = closedProposals > 0 ? Math.round(totalVotes / closedProposals) : 0;

    // Proposals by month (last 12 months)
    const now = new Date();
    const proposalsByMonth: Array<{ month: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const count = proposals.filter((p) => {
        const created = new Date(p.created_at);
        return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
      }).length;
      proposalsByMonth.push({ month: label, count });
    }

    // Top voters
    const votesByUser = new Map<string, number>();
    for (const v of votes) {
      votesByUser.set(v.user_id, (votesByUser.get(v.user_id) ?? 0) + 1);
    }
    const topUserIds = [...votesByUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);
    const topUsers = topUserIds.length > 0
      ? await this.dataSource.getRepository(User).findBy(topUserIds.map((id) => ({ id })))
      : [];
    const topVoters = topUserIds.map((id) => ({
      user_id: id,
      name: topUsers.find((u) => u.id === id)?.name ?? 'Unknown',
      voteCount: votesByUser.get(id) ?? 0,
    }));

    const proposalOutcomes = {
      passed: proposals.filter((p) => p.outcome === 'implemented' || p.outcome === 'in_progress').length,
      failed: proposals.filter((p) => p.outcome === 'not_implemented').length,
      withdrawn: proposals.filter((p) => p.status === 'withdrawn').length,
    };

    return {
      totalProposals,
      openProposals,
      closedProposals,
      totalVotes,
      totalMembers,
      participationRate,
      avgVotesPerProposal,
      proposalsByMonth,
      topVoters,
      proposalOutcomes,
    };
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

  async getDecisionRecord(slug: string, actorId: string, page = 1, pageSize = 25): Promise<{
    items: Array<{
      proposal: { id: string; title: string; proposal_type: string; topic_name: string; author_name: string | null; closed_at: string | null; threshold: number; outcome: string | null; status: string; anonymous_voting: boolean };
      tally: { yes: number; no: number; abstain: number } | null;
      result: 'passed' | 'failed' | 'no-votes' | 'withdrawn';
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, actorId, ['admin', 'moderator', 'member', 'observer']);

    const [proposals, total] = await this.dataSource.getRepository(Proposal).findAndCount({
      where: [
        { organisation_id: org.id, status: 'closed' as any },
        { organisation_id: org.id, status: 'withdrawn' as any },
      ],
      order: { closed_at: 'DESC', created_at: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    if (proposals.length === 0) return { items: [], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };

    const proposalIds = proposals.map((p) => p.id);
    const [votes, topics, users] = await Promise.all([
      this.dataSource.getRepository(Vote).find({ where: proposalIds.map((id) => ({ proposal_id: id })) }),
      this.dataSource.getRepository(Topic).find({ where: { organisation_id: org.id } }),
      this.dataSource.getRepository(User).find(),
    ]);

    const topicMap = new Map(topics.map((t) => [t.id, t.name]));
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const items = proposals.map((p) => {
      const pVotes = votes.filter((v) => v.proposal_id === p.id);
      const yes = pVotes.filter((v) => v.choice === 'yes').length;
      const no = pVotes.filter((v) => v.choice === 'no').length;
      const abstain = pVotes.filter((v) => v.choice === 'abstain').length;
      const tally = p.anonymous_voting ? null : { yes, no, abstain };
      const nonAnonTally = { yes, no, abstain };

      let result: 'passed' | 'failed' | 'no-votes' | 'withdrawn';
      if (p.status === 'withdrawn') {
        result = 'withdrawn';
      } else if (nonAnonTally.yes + nonAnonTally.no === 0) {
        result = 'no-votes';
      } else {
        result = (nonAnonTally.yes / (nonAnonTally.yes + nonAnonTally.no)) * 100 >= (p.threshold ?? 50) ? 'passed' : 'failed';
      }

      return {
        proposal: {
          id: p.id,
          title: p.title,
          proposal_type: p.proposal_type,
          topic_name: topicMap.get(p.topic_id) ?? 'Unknown',
          author_name: p.author_id ? (userMap.get(p.author_id) ?? null) : null,
          closed_at: p.closed_at ? p.closed_at.toISOString() : null,
          threshold: p.threshold ?? 50,
          outcome: p.outcome ?? null,
          status: p.status,
          anonymous_voting: p.anonymous_voting,
        },
        tally,
        result,
      };
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // Legacy non-paginated version kept for export
  async getDecisionRecordAll(slug: string, actorId: string): Promise<Array<{
    proposal: { id: string; title: string; proposal_type: string; topic_name: string; author_name: string | null; closed_at: string | null; threshold: number; outcome: string | null; status: string; anonymous_voting: boolean };
    tally: { yes: number; no: number; abstain: number } | null;
    result: 'passed' | 'failed' | 'no-votes' | 'withdrawn';
  }>> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, actorId, ['admin', 'moderator', 'member', 'observer']);

    const proposals = await this.dataSource.getRepository(Proposal).find({
      where: [
        { organisation_id: org.id, status: 'closed' as any },
        { organisation_id: org.id, status: 'withdrawn' as any },
      ],
      order: { closed_at: 'DESC', created_at: 'DESC' },
    });

    if (proposals.length === 0) return [];

    const proposalIds = proposals.map((p) => p.id);
    const [votes, topics, users] = await Promise.all([
      this.dataSource.getRepository(Vote).find({ where: proposalIds.map((id) => ({ proposal_id: id })) }),
      this.dataSource.getRepository(Topic).find({ where: { organisation_id: org.id } }),
      this.dataSource.getRepository(User).find(),
    ]);

    const topicMap = new Map(topics.map((t) => [t.id, t.name]));
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return proposals.map((p) => {
      const pVotes = votes.filter((v) => v.proposal_id === p.id);
      const yes = pVotes.filter((v) => v.choice === 'yes').length;
      const no = pVotes.filter((v) => v.choice === 'no').length;
      const abstain = pVotes.filter((v) => v.choice === 'abstain').length;
      const tally = p.anonymous_voting ? null : { yes, no, abstain };
      const nonAnonTally = { yes, no, abstain };

      let result: 'passed' | 'failed' | 'no-votes' | 'withdrawn';
      if (p.status === 'withdrawn') {
        result = 'withdrawn';
      } else if (nonAnonTally.yes + nonAnonTally.no === 0) {
        result = 'no-votes';
      } else {
        result = (nonAnonTally.yes / (nonAnonTally.yes + nonAnonTally.no)) * 100 >= (p.threshold ?? 50) ? 'passed' : 'failed';
      }

      return {
        proposal: {
          id: p.id,
          title: p.title,
          proposal_type: p.proposal_type,
          topic_name: topicMap.get(p.topic_id) ?? 'Unknown',
          author_name: p.author_id ? (userMap.get(p.author_id) ?? null) : null,
          closed_at: p.closed_at ? p.closed_at.toISOString() : null,
          threshold: p.threshold ?? 50,
          outcome: p.outcome ?? null,
          status: p.status,
          anonymous_voting: p.anonymous_voting,
        },
        tally,
        result,
      };
    });
  }

  async inviteByEmail(slug: string, email: string, actorId: string): Promise<{ id: string }> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, actorId, ['admin', 'moderator']);

    const normalised = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalised)) {
      throw new BadRequestException('Invalid email address');
    }

    // Check if already a member
    const existingUser = await this.userRepo.findOneBy({ email: normalised });
    if (existingUser) {
      const existing = await this.memberRepo.findOneBy({ organisation_id: org.id, user_id: existingUser.id });
      if (existing) throw new ConflictException('This person is already a member');
    }

    // Check for pending unexpired invite
    const pending = await this.inviteRepo.findOne({
      where: { org_id: org.id, email: normalised, accepted_at: undefined as any },
    });
    if (pending && pending.accepted_at === null && pending.expires_at > new Date()) {
      throw new ConflictException('An invite has already been sent to this address');
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await this.inviteRepo.save(
      this.inviteRepo.create({ id: randomUUID(), org_id: org.id, email: normalised, token, invited_by: actorId, expires_at: expires }),
    );

    const inviter = await this.userRepo.findOneBy({ id: actorId });
    const baseUrl = process.env.APP_URL ?? 'http://localhost:5173';
    this.email.sendInvite(normalised, inviter?.name ?? 'Someone', org.name, `${baseUrl}/accept-invite?token=${token}`)
      .catch(() => { /* non-critical */ });

    return { id: invite.id };
  }

  async listPendingInvites(slug: string, actorId: string): Promise<Array<{ id: string; email: string; created_at: Date; expires_at: Date; invited_by_name: string | null }>> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, actorId, ['admin', 'moderator']);

    const invites = await this.inviteRepo.find({
      where: { org_id: org.id },
      order: { created_at: 'DESC' },
    });
    const pending = invites.filter((i) => i.accepted_at === null && i.expires_at > new Date());

    const inviterIds = [...new Set(pending.map((i) => i.invited_by).filter(Boolean) as string[])];
    const inviters = inviterIds.length > 0
      ? await this.userRepo.findBy(inviterIds.map((id) => ({ id })))
      : [];
    const inviterMap = new Map(inviters.map((u) => [u.id, u.name]));

    return pending.map((i) => ({
      id: i.id,
      email: i.email,
      created_at: i.created_at,
      expires_at: i.expires_at,
      invited_by_name: i.invited_by ? (inviterMap.get(i.invited_by) ?? null) : null,
    }));
  }

  async cancelInvite(slug: string, inviteId: string, actorId: string): Promise<void> {
    const org = await this.findBySlug(slug);
    await this.requireRole(org.id, actorId, ['admin', 'moderator']);
    const invite = await this.inviteRepo.findOneBy({ id: inviteId, org_id: org.id });
    if (!invite) throw new NotFoundException('Invite not found');
    await this.inviteRepo.delete(inviteId);
  }

  async getInviteInfo(token: string): Promise<{ org: { id: string; name: string; description: string; slug: string }; email: string }> {
    const invite = await this.inviteRepo.findOneBy({ token });
    if (!invite || invite.accepted_at !== null || invite.expires_at < new Date()) {
      throw new NotFoundException('This invitation is invalid or has expired');
    }
    const org = await this.orgRepo.findOneBy({ id: invite.org_id });
    if (!org) throw new NotFoundException('Organisation not found');
    return { org: { id: org.id, name: org.name, description: org.description, slug: org.slug }, email: invite.email };
  }

  async acceptEmailInvite(token: string, userId: string): Promise<{ item: Membership; txid: number }> {
    const invite = await this.inviteRepo.findOneBy({ token });
    if (!invite || invite.accepted_at !== null || invite.expires_at < new Date()) {
      throw new BadRequestException('This invitation is invalid or has expired');
    }
    const user = await this.userRepo.findOneByOrFail({ id: userId });
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }
    const existing = await this.memberRepo.findOneBy({ organisation_id: invite.org_id, user_id: userId });
    if (existing) {
      await this.inviteRepo.update(invite.id, { accepted_at: new Date() });
      return { item: existing, txid: 0 };
    }

    return this.dataSource.transaction(async (manager) => {
      const membership = manager.create(Membership, {
        id: randomUUID(),
        organisation_id: invite.org_id,
        user_id: userId,
        role: 'member',
      });
      const saved = await manager.save(membership);
      await manager.update(OrgInvite, invite.id, { accepted_at: new Date() });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item: saved, txid: parseInt(row.txid, 10) };
    });
  }

  async exportDecisionRecordCsv(slug: string, actorId: string): Promise<string> {
    const records = await this.getDecisionRecordAll(slug, actorId);
    const headers = ['Title', 'Topic', 'Type', 'Status', 'Result', 'Closed Date', 'Yes', 'No', 'Abstain', 'Yes %', 'Threshold %', 'Implementation Status'];
    const rows = records.map(({ proposal, tally, result }) => {
      const yesCount = tally?.yes ?? '';
      const noCount = tally?.no ?? '';
      const abstainCount = tally?.abstain ?? '';
      const yesPct = tally && (tally.yes + tally.no) > 0
        ? Math.round((tally.yes / (tally.yes + tally.no)) * 100)
        : '';
      const closedDate = proposal.closed_at ? new Date(proposal.closed_at).toISOString().slice(0, 10) : '';
      return [
        `"${proposal.title.replace(/"/g, '""')}"`,
        `"${proposal.topic_name.replace(/"/g, '""')}"`,
        proposal.proposal_type,
        proposal.status,
        result,
        closedDate,
        yesCount,
        noCount,
        abstainCount,
        yesPct,
        proposal.threshold,
        proposal.outcome ?? '',
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }
}
