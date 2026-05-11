import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delegation } from './delegation.entity';
import { DelegationsController } from './delegations.controller';
import { DelegationsService } from './delegations.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Delegation]), NotificationsModule],
  controllers: [DelegationsController],
  providers: [DelegationsService],
})
export class DelegationsModule {}
