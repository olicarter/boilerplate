import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organisation } from './organisation.entity';
import { Membership } from './membership.entity';
import { OrgInvite } from './org-invite.entity';
import { Proposal } from '../proposals/proposal.entity';
import { User } from '../users/user.entity';
import { OrganisationsService } from './organisations.service';
import { OrganisationsController } from './organisations.controller';
import { OrganisationsScheduler } from './organisations.scheduler';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([Organisation, Membership, OrgInvite, Proposal, User]), AuditLogModule, NotificationsModule, WebhooksModule],
  providers: [OrganisationsService, OrganisationsScheduler],
  controllers: [OrganisationsController],
  exports: [OrganisationsService],
})
export class OrganisationsModule {}
