import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Endorsement } from './endorsement.entity';
import { Proposal } from '../proposals/proposal.entity';
import { Membership } from '../organisations/membership.entity';
import { EndorsementsService } from './endorsements.service';
import { EndorsementsController } from './endorsements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Endorsement, Proposal, Membership])],
  providers: [EndorsementsService],
  controllers: [EndorsementsController],
  exports: [EndorsementsService],
})
export class EndorsementsModule {}
