import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { TopicsModule } from './topics/topics.module';
import { ProposalsModule } from './proposals/proposals.module';
import { DelegationsModule } from './delegations/delegations.module';
import { VotesModule } from './votes/votes.module';
import { User } from './users/user.entity';
import { Topic } from './topics/topic.entity';
import { Proposal } from './proposals/proposal.entity';
import { Delegation } from './delegations/delegation.entity';
import { Vote } from './votes/vote.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ??
        'postgresql://postgres:password@localhost:5432/ripple',
      entities: [User, Topic, Proposal, Delegation, Vote],
      synchronize: false,
    }),
    UsersModule,
    TopicsModule,
    ProposalsModule,
    DelegationsModule,
    VotesModule,
  ],
})
export class AppModule {}
