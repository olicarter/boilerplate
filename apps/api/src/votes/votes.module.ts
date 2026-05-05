import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vote } from './vote.entity';
import { Proposal } from '../proposals/proposal.entity';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vote, Proposal])],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
