import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID, randomBytes } from 'crypto';
import type { Request } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture, RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { Credential } from './credential.entity';
import { MagicLink } from './magic-link.entity';
import { User } from '../users/user.entity';
import { EmailService } from '../email/email.service';
import { RedisService } from '../redis/redis.service';

const RP_ID = process.env.RP_ID ?? 'localhost';
const RP_NAME = 'Ripple';
const ORIGIN = process.env.ORIGIN
  ? process.env.ORIGIN.split(',').map((o) => o.trim())
  : ['https://localhost:5174', 'http://localhost:5173'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 100;
const CHALLENGE_TTL = 5 * 60;

// In-memory fallback when Redis is not available
const challengeStore = new Map<string, string | true>();

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Credential)
    private readonly credentialRepo: Repository<Credential>,
    @InjectRepository(MagicLink)
    private readonly magicLinkRepo: Repository<MagicLink>,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly redisService: RedisService,
  ) {}

  private async challengeSet(challenge: string, value: string): Promise<void> {
    if (this.redisService.enabled) {
      await this.redisService.set(`challenge:${challenge}`, value, CHALLENGE_TTL);
    } else {
      challengeStore.set(challenge, value === '__auth__' ? true : value);
      setTimeout(() => challengeStore.delete(challenge), CHALLENGE_TTL * 1000);
    }
  }

  private async challengeGet(challenge: string): Promise<string | true | null> {
    if (this.redisService.enabled) {
      return this.redisService.get(`challenge:${challenge}`);
    }
    return challengeStore.get(challenge) ?? null;
  }

  private async challengeDel(challenge: string): Promise<void> {
    if (this.redisService.enabled) {
      await this.redisService.del(`challenge:${challenge}`);
    } else {
      challengeStore.delete(challenge);
    }
  }

  async registerBegin(data: { name: string; email: string }) {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('Name is required');
    if (name.length > NAME_MAX) throw new BadRequestException(`Name must be ${NAME_MAX} characters or fewer`);
    const email = data.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email is required');
    if (!EMAIL_RE.test(email)) throw new BadRequestException('Invalid email address');

    let user = await this.userRepo.findOneBy({ email: data.email });
    if (!user) {
      user = await this.userRepo.save(
        this.userRepo.create({ id: randomUUID(), name: data.name, email: data.email }),
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

    await this.challengeSet(options.challenge, user.id);

    return options;
  }

  async registerFinish(response: RegistrationResponseJSON, req: Request) {
    const { clientDataJSON } = response.response;
    const clientData = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString());
    const challenge = clientData.challenge as string;

    const userId = await this.challengeGet(challenge);
    if (!userId || userId === '__auth__') throw new UnauthorizedException('Invalid or expired challenge');
    await this.challengeDel(challenge);

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

    const baseUrl = process.env.APP_URL ?? 'http://localhost:5173';
    if (!user.email_verified) {
      await this.sendVerificationEmail(user);
    }
    this.emailService.sendWelcome(user.email, user.name, baseUrl).catch(() => { /* non-critical */ });

    return user;
  }

  async sendVerificationEmail(user: User): Promise<void> {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userRepo.update(user.id, {
      email_verification_token: token,
      email_verification_token_expires_at: expires,
    });
    const baseUrl = process.env.APP_URL ?? 'http://localhost:5173';
    await this.emailService.sendVerification(user.email, token, baseUrl).catch(() => { /* non-critical */ });
  }

  async verifyEmail(token: string): Promise<{ success: boolean }> {
    const user = await this.userRepo.findOneBy({ email_verification_token: token });
    if (!user) throw new BadRequestException('Invalid or expired verification token');
    if (!user.email_verification_token_expires_at || user.email_verification_token_expires_at < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }
    await this.userRepo.update(user.id, {
      email_verified: true,
      email_verification_token: null,
      email_verification_token_expires_at: null,
    });
    return { success: true };
  }

  async loginBegin() {
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'preferred',
    });

    await this.challengeSet(options.challenge, '__auth__');

    return options;
  }

  async loginFinish(response: AuthenticationResponseJSON, req: Request) {
    const { clientDataJSON } = response.response;
    const clientData = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString());
    const challenge = clientData.challenge as string;

    const storedAuth = await this.challengeGet(challenge);
    if (!storedAuth) throw new UnauthorizedException('Invalid or expired challenge');
    await this.challengeDel(challenge);

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

  async listPasskeys(userId: string) {
    return this.credentialRepo.findBy({ userId });
  }

  async addPasskeyBegin(userId: string) {
    const user = await this.userRepo.findOneByOrFail({ id: userId });
    const existingCredentials = await this.credentialRepo.findBy({ userId });

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

    await this.challengeSet(options.challenge, userId);

    return options;
  }

  async addPasskeyFinish(response: RegistrationResponseJSON, userId: string) {
    const { clientDataJSON } = response.response;
    const clientData = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString());
    const challenge = clientData.challenge as string;

    const storedUserId = await this.challengeGet(challenge);
    if (!storedUserId || storedUserId === '__auth__' || storedUserId !== userId) {
      throw new UnauthorizedException('Invalid or expired challenge');
    }
    await this.challengeDel(challenge);

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
        userId,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: (response.response.transports ?? []) as string[],
      }),
    );

    return { success: true };
  }

  async deletePasskey(credentialId: string, userId: string) {
    const count = await this.credentialRepo.countBy({ userId });
    if (count <= 1) throw new BadRequestException('Cannot remove your only passkey');

    const credential = await this.credentialRepo.findOneBy({ id: credentialId, userId });
    if (!credential) throw new NotFoundException('Passkey not found');

    await this.credentialRepo.delete(credentialId);
    return { success: true };
  }

  async magicLinkBegin(email: string): Promise<{ success: boolean }> {
    const normalised = email?.trim().toLowerCase();
    if (!normalised || !EMAIL_RE.test(normalised)) throw new BadRequestException('Invalid email address');
    // Always return success to avoid email enumeration
    const user = await this.userRepo.findOneBy({ email: normalised });
    if (!user) return { success: true };

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await this.magicLinkRepo.save(this.magicLinkRepo.create({ userId: user.id, token, expires_at: expires }));

    const baseUrl = process.env.APP_URL ?? 'http://localhost:5173';
    const magicUrl = `${baseUrl}/magic?token=${token}`;
    await this.emailService.sendMagicLink(user.email, magicUrl).catch(() => { /* non-critical */ });

    return { success: true };
  }

  async magicLinkVerify(token: string, req: Request): Promise<User> {
    const link = await this.magicLinkRepo.findOne({ where: { token }, relations: ['user'] });
    if (!link || link.used_at) throw new UnauthorizedException('Invalid or expired magic link');
    if (link.expires_at < new Date()) throw new UnauthorizedException('Magic link has expired');

    await this.magicLinkRepo.update(link.id, { used_at: new Date() });
    req.session!.userId = link.user.id;
    return link.user;
  }

  logout(req: Request) {
    req.session!.userId = undefined;
    return { success: true };
  }

  async testReset(): Promise<{ success: boolean }> {
    await this.dataSource.query(
      `TRUNCATE organisations, users, topics, proposals, delegations, votes, credentials, audit_log, notifications CASCADE`,
    );
    return { success: true };
  }

  async testSetup(data: { name: string; email: string }, req: Request): Promise<User & { org: { id: string; slug: string; name: string } }> {
    let user = await this.userRepo.findOneBy({ email: data.email });
    if (!user) {
      user = await this.userRepo.save(this.userRepo.create({ id: randomUUID(), ...data }));
    }
    req.session!.userId = user.id;

    // Find or create the shared test org
    const TEST_ORG_ID = '00000000-0000-0000-0000-000000000002';
    const TEST_ORG_SLUG = 'ripple-test';
    await this.dataSource.query(
      `INSERT INTO organisations (id, name, slug, description)
       VALUES ($1, $2, $3, '')
       ON CONFLICT (id) DO NOTHING`,
      [TEST_ORG_ID, 'Ripple Test', TEST_ORG_SLUG],
    );
    await this.dataSource.query(
      `INSERT INTO memberships (id, organisation_id, user_id, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (organisation_id, user_id) DO NOTHING`,
      [randomUUID(), TEST_ORG_ID, user.id],
    );

    return { ...user, org: { id: TEST_ORG_ID, slug: TEST_ORG_SLUG, name: 'Ripple Test' } };
  }
}
