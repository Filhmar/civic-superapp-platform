import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AppConfigModule, AppConfigService } from '@app/common';
import { MongodbModule } from '@app/mongodb';
import { NotificationController } from './notification.controller';
import {
  NotificationService,
  INTEGRATION_CLIENT,
  IDENTITY_CLIENT,
} from './notification.service';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { AuditEvent, AuditEventSchema } from './schemas/audit-event.schema';

@Module({
  imports: [
    AppConfigModule,
    MongodbModule.forService('MONGODB_NOTIFICATION_URI'),
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: AuditEvent.name, schema: AuditEventSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    {
      provide: INTEGRATION_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { host, port } = config.tcpEndpoint('integration');
        return ClientProxyFactory.create({ transport: Transport.TCP, options: { host, port } });
      },
    },
    {
      provide: IDENTITY_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { host, port } = config.tcpEndpoint('identity');
        return ClientProxyFactory.create({ transport: Transport.TCP, options: { host, port } });
      },
    },
  ],
})
export class NotificationModule {}
