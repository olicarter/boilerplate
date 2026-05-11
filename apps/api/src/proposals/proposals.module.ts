import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proposal } from './proposal.entity';
import { ProposalOption } from './proposal-option.entity';
import { ProposalReaction } from './proposal-reaction.entity';
import { ProposalVersion } from './proposal-version.entity';
import { ProposalSignature } from './proposal-signature.entity';
import { Vote } from '../votes/vote.entity';
import { Delegation } from '../delegations/delegation.entity';
import { Organisation } from '../organisations/organisation.entity';
import { Membership } from '../organisations/membership.entity';
import { Endorsement } from '../endorsements/endorsement.entity';
import { User } from '../users/user.entity';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { ProposalsScheduler } from './proposals.scheduler';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([Proposal, ProposalOption, ProposalReaction, ProposalVersion, ProposalSignature, Vote, Delegation, Organisation, Membership, Endorsement, User]), AuditLogModule, NotificationsModule],
  controllers: [ProposalsController],
  providers: [ProposalsService, ProposalsScheduler],
})
export class ProposalsModule {}
