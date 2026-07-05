import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigModule } from '@app/common';
import { RedisModule } from '@app/redis';
import { IdentityController } from './identity.controller';
import { PrismaService } from './prisma.service';
import { OtpService } from './services/otp.service';
import { AuthService } from './services/auth.service';
import { ProfileService } from './services/profile.service';
import { DigitalIdService } from './services/digital-id.service';
import { SmsProvider } from './services/sms.provider';
import { TokenService } from './services/token.service';

@Module({
  imports: [AppConfigModule, RedisModule, JwtModule.register({})],
  controllers: [IdentityController],
  providers: [
    PrismaService,
    OtpService,
    AuthService,
    ProfileService,
    DigitalIdService,
    SmsProvider,
    TokenService,
  ],
})
export class IdentityModule {}
