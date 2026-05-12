import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vote } from './vote.entity';
import { Proposal } from '../proposals/proposal.entity';
import { Delegation } from '../delegations/delegation.entity';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Vote, Proposal, Delegation]), NotificationsModule, WebhooksModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
