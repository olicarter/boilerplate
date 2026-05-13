import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Credential } from './credential.entity';
import { MagicLink } from './magic-link.entity';
import { Organisation } from '../organisations/organisation.entity';
import { Membership } from '../organisations/membership.entity';
import { AuthService } from './auth.service';
import { OidcService } from './oidc.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, Credential, MagicLink, Organisation, Membership])],
  providers: [AuthService, OidcService, AuthGuard],
  controllers: [AuthController],
  exports: [AuthGuard],
})
export class AuthModule {}
