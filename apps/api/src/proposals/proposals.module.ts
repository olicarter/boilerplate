import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proposal } from './proposal.entity';
import { ProposalVersion } from './proposal-version.entity';
import { Vote } from '../votes/vote.entity';
import { Delegation } from '../delegations/delegation.entity';
import { Organisation } from '../organisations/organisation.entity';
import { Membership } from '../organisations/membership.entity';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { ProposalsScheduler } from './proposals.scheduler';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([Proposal, ProposalVersion, Vote, Delegation, Organisation, Membership]), AuditLogModule],
  controllers: [ProposalsController],
  providers: [ProposalsService, ProposalsScheduler],
})
export class ProposalsModule {}
