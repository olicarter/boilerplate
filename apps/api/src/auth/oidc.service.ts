import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import * as oidc from 'openid-client';

export interface OidcUserInfo {
  sub: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name);
  private readonly configCache = new Map<string, { config: oidc.Configuration; expiresAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private getRedirectUri(orgSlug: string): string {
    const base = process.env.APP_URL ?? 'http://localhost:5173';
    return `${base}/auth/sso/${orgSlug}/callback`;
  }

  private getApiRedirectUri(orgSlug: string): string {
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
    return `${apiUrl}/api/auth/sso/${orgSlug}/callback`;
  }

  async getConfig(issuer: string, clientId: string, clientSecret: string): Promise<oidc.Configuration> {
    const cacheKey = `${issuer}:${clientId}`;
    const cached = this.configCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.config;

    try {
      const serverUrl = new URL(issuer);
      const config = await oidc.discovery(serverUrl, clientId, clientSecret);
      this.configCache.set(cacheKey, { config, expiresAt: Date.now() + this.CACHE_TTL });
      return config;
    } catch (err) {
      this.logger.error(`OIDC discovery failed for ${issuer}: ${err}`);
      throw new BadRequestException(`Failed to connect to OIDC provider: ${issuer}`);
    }
  }

  async buildAuthUrl(
    issuer: string,
    clientId: string,
    clientSecret: string,
    orgSlug: string,
    state: string,
    codeVerifier: string,
  ): Promise<URL> {
    const config = await this.getConfig(issuer, clientId, clientSecret);
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const redirectUri = this.getApiRedirectUri(orgSlug);

    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return url;
  }

  async exchangeCode(
    issuer: string,
    clientId: string,
    clientSecret: string,
    orgSlug: string,
    currentUrl: URL,
    expectedState: string,
    codeVerifier: string,
  ): Promise<OidcUserInfo> {
    const config = await this.getConfig(issuer, clientId, clientSecret);
    const redirectUri = this.getApiRedirectUri(orgSlug);

    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      expectedState,
      pkceCodeVerifier: codeVerifier,
    });

    const claims = tokens.claims();
    if (!claims?.sub) throw new UnauthorizedException('OIDC: missing sub claim');

    // Prefer userinfo endpoint; fall back to ID token claims
    let email = String(claims.email ?? '');
    let name = String(claims.name ?? '');

    try {
      const userinfo = await oidc.fetchUserInfo(config, tokens.access_token ?? '', claims.sub);
      email = String(userinfo.email ?? email);
      name = String(userinfo.name ?? (userinfo as Record<string, unknown>).given_name ?? name);
    } catch {
      // userinfo endpoint may not exist; ID token claims are enough
    }

    if (!email) throw new UnauthorizedException('OIDC: provider did not return an email address');

    return {
      sub: String(claims.sub),
      email: email.toLowerCase(),
      name: name || undefined,
    };
  }
}
