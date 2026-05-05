import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proposal } from './proposal.entity';
import { Vote } from '../votes/vote.entity';
import { Delegation } from '../delegations/delegation.entity';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { ProposalsScheduler } from './proposals.scheduler';

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([Proposal, Vote, Delegation])],
  controllers: [ProposalsController],
  providers: [ProposalsService, ProposalsScheduler],
})
export class ProposalsModule {}
