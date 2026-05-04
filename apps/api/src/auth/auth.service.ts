import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { Request } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture, RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { Credential } from './credential.entity';
import { User } from '../users/user.entity';

const RP_ID = process.env.RP_ID ?? 'localhost';
const RP_NAME = 'Ripple';
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5173';

// In-memory challenge store: challenge (base64url) → userId (for registration) or true (for auth)
const challengeStore = new Map<string, string | true>();

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Credential)
    private readonly credentialRepo: Repository<Credential>,
    private readonly dataSource: DataSource,
  ) {}

  async registerBegin(data: { name: string; email: string }) {
    let user = await this.userRepo.findOneBy({ email: data.email });
    if (!user) {
      user = await this.userRepo.save(
        this.userRepo.create({ name: data.name, email: data.email }),
      );
    }

    const existingCredentials = await this.credentialRepo.findBy({ userId: user.id });

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: user.email,
      userDisplayName: user.name,
      userID: Buffer.from(user.id),
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
      excludeCredentials: existingCredentials.map((c) => ({
        id: c.id,
        transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
      })),
    });

    challengeStore.set(options.challenge, user.id);
    setTimeout(() => challengeStore.delete(options.challenge), 5 * 60 * 1000);

    return options;
  }

  async registerFinish(response: RegistrationResponseJSON, req: Request) {
    const { clientDataJSON } = response.response;
    const clientData = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString());
    const challenge = clientData.challenge as string;

    const userId = challengeStore.get(challenge);
    if (!userId || userId === true) throw new UnauthorizedException('Invalid or expired challenge');
    challengeStore.delete(challenge);

    const user = await this.userRepo.findOneByOrFail({ id: userId as string });

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException('Registration verification failed');
    }

    const { credential } = verification.registrationInfo;

    await this.credentialRepo.save(
      this.credentialRepo.create({
        id: credential.id,
        userId: user.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: (response.response.transports ?? []) as string[],
      }),
    );

    req.session!.userId = user.id;
    return user;
  }

  async loginBegin() {
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'preferred',
    });

    challengeStore.set(options.challenge, true);
    setTimeout(() => challengeStore.delete(options.challenge), 5 * 60 * 1000);

    return options;
  }

  async loginFinish(response: AuthenticationResponseJSON, req: Request) {
    const { clientDataJSON } = response.response;
    const clientData = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString());
    const challenge = clientData.challenge as string;

    if (!challengeStore.has(challenge)) throw new UnauthorizedException('Invalid or expired challenge');
    challengeStore.delete(challenge);

    const credential = await this.credentialRepo.findOne({
      where: { id: response.id },
      relations: ['user'],
    });
    if (!credential) throw new NotFoundException('Credential not found');

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
      credential: {
        id: credential.id,
        publicKey: new Uint8Array(credential.publicKey),
        counter: Number(credential.counter),
        transports: (credential.transports ?? []) as AuthenticatorTransportFuture[],
      },
    });

    if (!verification.verified) throw new UnauthorizedException('Authentication failed');

    await this.credentialRepo.update(credential.id, {
      counter: verification.authenticationInfo.newCounter,
    });

    req.session!.userId = credential.user.id;
    return credential.user;
  }

  logout(req: Request) {
    req.session!.userId = undefined;
    return { success: true };
  }

  async testReset(): Promise<{ success: boolean }> {
    await this.dataSource.query(
      `TRUNCATE users, topics, proposals, delegations, votes, credentials CASCADE`,
    );
    return { success: true };
  }

  async testSetup(data: { name: string; email: string }, req: Request): Promise<User> {
    let user = await this.userRepo.findOneBy({ email: data.email });
    if (!user) {
      user = await this.userRepo.save(this.userRepo.create(data));
    }
    req.session!.userId = user.id;
    return user;
  }
}
