import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './users/users.module';
import { TopicsModule } from './topics/topics.module';
import { ProposalsModule } from './proposals/proposals.module';
import { DelegationsModule } from './delegations/delegations.module';
import { VotesModule } from './votes/votes.module';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { OrganisationsModule } from './organisations/organisations.module';
import { User } from './users/user.entity';
import { Topic } from './topics/topic.entity';
import { Proposal } from './proposals/proposal.entity';
import { Delegation } from './delegations/delegation.entity';
import { Vote } from './votes/vote.entity';
import { Credential } from './auth/credential.entity';
import { Comment } from './comments/comment.entity';
import { CommentReaction } from './comments/comment-reaction.entity';
import { ProposalVersion } from './proposals/proposal-version.entity';
import { Organisation } from './organisations/organisation.entity';
import { Membership } from './organisations/membership.entity';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ??
        'postgresql://postgres:password@localhost:5432/ripple',
      entities: [User, Topic, Proposal, Delegation, Vote, Credential, Comment, CommentReaction, ProposalVersion, Organisation, Membership],
      migrations: [__dirname + '/db/migrations/*.ts'],
      migrationsRun: true,
      synchronize: false,
    }),
    UsersModule,
    TopicsModule,
    ProposalsModule,
    DelegationsModule,
    VotesModule,
    AuthModule,
    CommentsModule,
    OrganisationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
