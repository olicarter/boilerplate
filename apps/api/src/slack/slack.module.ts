import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackController } from './slack.controller';
import { SlackService } from './slack.service';
import { Organisation } from '../organisations/organisation.entity';
import { Membership } from '../organisations/membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organisation, Membership])],
  controllers: [SlackController],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}
