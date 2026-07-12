import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AppConfigModule, AppConfigService } from '@app/common';
import { RedisModule } from '@app/redis';
import { IdentityController } from './identity.controller';
import { PrismaService } from './prisma.service';
import { OtpService } from './services/otp.service';
import { AuthService } from './services/auth.service';
import { ProfileService } from './services/profile.service';
import { DigitalIdService } from './services/digital-id.service';
import { OtpDelivery, INTEGRATION_CLIENT } from './services/otp-delivery';
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
    OtpDelivery,
    TokenService,
    {
      provide: INTEGRATION_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { host, port } = config.tcpEndpoint('integration');
        return ClientProxyFactory.create({ transport: Transport.TCP, options: { host, port } });
      },
    },
  ],
})
export class IdentityModule {}
