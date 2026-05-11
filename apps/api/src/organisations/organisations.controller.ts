import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OrganisationsService } from './organisations.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import type { MemberRole } from './membership.entity';

@Controller('orgs')
export class OrganisationsController {
  constructor(
    private readonly orgsService: OrganisationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  listForUser(@Req() req: AuthenticatedRequest) {
    return this.orgsService.findForUser(req.user!.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() body: { name: string; slug?: string; description?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orgsService.create(body, req.user!.id);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.orgsService.findBySlug(slug);
  }

  @Patch(':slug')
  @UseGuards(AuthGuard)
  update(
    @Param('slug') slug: string,
    @Body() body: { name?: string; description?: string; proposal_creation_role?: 'member' | 'moderator' | 'admin'; topic_creation_role?: 'member' | 'moderator' | 'admin'; default_voting_duration_days?: number | null; default_threshold?: number; voting_visibility?: 'public' | 'hidden'; default_quorum?: number | null; is_public?: boolean; veto_role?: 'moderator' | 'admin'; min_endorsements?: number; require_member_approval?: boolean; weight_mode?: 'manual' | 'by_role'; proposal_templates?: Array<{ id: string; name: string; description: string; proposal_type: 'standard' | 'discussion' | 'multiple_choice'; threshold: number }> },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orgsService.update(slug, body, req.user!.id);
  }

  @Delete(':slug')
  @UseGuards(AuthGuard)
  delete(@Param('slug') slug: string, @Req() req: AuthenticatedRequest) {
    return this.orgsService.delete(slug, req.user!.id);
  }

  // --- Members ---

  @Get(':slug/members')
  async listMembers(@Param('slug') slug: string) {
    const org = await this.orgsService.findBySlug(slug);
    return this.orgsService.listMembers(org.id);
  }

  @Get(':slug/members/search')
  @UseGuards(AuthGuard)
  searchMembers(@Param('slug') slug: string, @Query('q') q = '') {
    return this.orgsService.searchMembers(slug, q);
  }

  @Post(':slug/members')
  @UseGuards(AuthGuard)
  async addMember(
    @Param('slug') slug: string,
    @Body() body: { user_id: string; role?: MemberRole },
    @Req() req: AuthenticatedRequest,
  ) {
    const org = await this.orgsService.findBySlug(slug);
    return this.orgsService.addMember(org.id, body.user_id, body.role ?? 'member', req.user!.id);
  }

  @Patch(':slug/members/:userId')
  @UseGuards(AuthGuard)
  async updateMemberRole(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
    @Body() body: { role?: MemberRole; weight?: number },
    @Req() req: AuthenticatedRequest,
  ) {
    const org = await this.orgsService.findBySlug(slug);
    if (body.role !== undefined) {
      return this.orgsService.updateMemberRole(org.id, userId, body.role, req.user!.id);
    }
    if (body.weight !== undefined) {
      return this.orgsService.updateMemberWeight(org.id, userId, body.weight, req.user!.id);
    }
    return {};
  }

  @Delete(':slug/members/:userId')
  @UseGuards(AuthGuard)
  async removeMember(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const org = await this.orgsService.findBySlug(slug);
    return this.orgsService.removeMember(org.id, userId, req.user!.id);
  }

  @Post(':slug/join')
  @UseGuards(AuthGuard)
  async join(
    @Param('slug') slug: string,
    @Body() body: { token?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    if (body.token) {
      return this.orgsService.joinViaToken(slug, req.user!.id, body.token);
    }
    return this.orgsService.joinPublic(slug, req.user!.id);
  }

  @Post(':slug/members/:userId/approve')
  @UseGuards(AuthGuard)
  async approveMember(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orgsService.approveMember(slug, userId, req.user!.id);
  }

  @Post(':slug/members/:userId/reject')
  @UseGuards(AuthGuard)
  async rejectMember(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orgsService.rejectMember(slug, userId, req.user!.id);
  }

  @Post(':slug/transfer-ownership')
  @UseGuards(AuthGuard)
  transferOwnership(
    @Param('slug') slug: string,
    @Body() body: { to_user_id: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orgsService.transferOwnership(slug, body.to_user_id, req.user!.id);
  }

  @Post(':slug/invite-token')
  @UseGuards(AuthGuard)
  generateInviteToken(@Param('slug') slug: string, @Req() req: AuthenticatedRequest) {
    return this.orgsService.generateInviteToken(slug, req.user!.id);
  }

  @Delete(':slug/invite-token')
  @UseGuards(AuthGuard)
  revokeInviteToken(@Param('slug') slug: string, @Req() req: AuthenticatedRequest) {
    return this.orgsService.revokeInviteToken(slug, req.user!.id);
  }

  @Get(':slug/audit-log')
  @UseGuards(AuthGuard)
  async getAuditLog(@Param('slug') slug: string, @Req() req: AuthenticatedRequest) {
    const org = await this.orgsService.findBySlug(slug);
    await this.orgsService.requireRole(org.id, req.user!.id, ['admin']);
    return this.auditLog.list(org.id, 50);
  }

  @Get(':slug/results')
  async getPublicResults(@Param('slug') slug: string) {
    return this.orgsService.getPublicResults(slug);
  }

  @Get(':slug/delegation-weights')
  @UseGuards(AuthGuard)
  getDelegationWeights(@Param('slug') slug: string) {
    return this.orgsService.getDelegationWeights(slug);
  }
}
