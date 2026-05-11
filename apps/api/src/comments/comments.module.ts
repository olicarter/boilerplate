import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { CommentReaction } from './comment-reaction.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { Proposal } from '../proposals/proposal.entity';
import { Membership } from '../organisations/membership.entity';
import { User } from '../users/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganisationsModule } from '../organisations/organisations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, CommentReaction, Proposal, Membership, User]), NotificationsModule, OrganisationsModule],
  providers: [CommentsService],
  controllers: [CommentsController],
})
export class CommentsModule {}
