import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Argument } from './argument.entity';
import { Proposal } from '../proposals/proposal.entity';
import { Membership } from '../organisations/membership.entity';
import { ArgumentsService } from './arguments.service';
import { ArgumentsController } from './arguments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Argument, Proposal, Membership])],
  providers: [ArgumentsService],
  controllers: [ArgumentsController],
})
export class ArgumentsModule {}
