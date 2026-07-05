import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AppConfigService } from '@app/common';

export type TokenScope = 'resident' | 'guest';

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  scope: TokenScope;
  sessionId: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tenantId: string;
  sessionId: string;
  kind: 'refresh';
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  signAccess(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.require('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
    });
  }

  signRefresh(payload: RefreshTokenPayload): string {
    // jti makes every rotation produce a distinct token even within the same
    // second — otherwise identical payload+iat would re-issue the same string
    // and reuse detection could never distinguish old from new.
    return this.jwt.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.require('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );
  }

  verifyRefresh(token: string): RefreshTokenPayload {
    return this.jwt.verify<RefreshTokenPayload>(token, {
      secret: this.config.require('JWT_REFRESH_SECRET'),
    });
  }
}
