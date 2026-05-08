import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Veto } from './veto.entity';
import { Proposal } from '../proposals/proposal.entity';
import { Organisation } from '../organisations/organisation.entity';
import { Membership } from '../organisations/membership.entity';
import { VetoesService } from './vetoes.service';
import { VetoesController } from './vetoes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Veto, Proposal, Organisation, Membership])],
  providers: [VetoesService],
  controllers: [VetoesController],
})
export class VetoesModule {}
