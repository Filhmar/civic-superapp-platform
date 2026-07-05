import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AppConfigModule, AppConfigService } from '@app/common';
import { EgovController } from './egov.controller';
import { EgovService, NOTIFICATION_CLIENT } from './egov.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [AppConfigModule],
  controllers: [EgovController],
  providers: [
    EgovService,
    PrismaService,
    {
      provide: NOTIFICATION_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { host, port } = config.tcpEndpoint('notification');
        return ClientProxyFactory.create({ transport: Transport.TCP, options: { host, port } });
      },
    },
  ],
})
export class EgovModule {}
