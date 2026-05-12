import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Credential } from './credential.entity';
import { MagicLink } from './magic-link.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Credential, MagicLink])],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
