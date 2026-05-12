import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Organisation } from '../organisations/organisation.entity';
import { Membership } from '../organisations/membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organisation, Membership])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
