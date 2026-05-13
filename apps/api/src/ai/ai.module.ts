import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { Proposal } from '../proposals/proposal.entity';
import { Argument } from '../arguments/argument.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Proposal, Argument])],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
