import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AppConfigModule, AppConfigService } from '@app/common';
import { MongodbModule } from '@app/mongodb';
import { AssistanceController } from './assistance.controller';
import { AssistanceService, NOTIFICATION_CLIENT } from './assistance.service';
import {
  AssistanceProgram,
  AssistanceProgramSchema,
  AssistanceRequest,
  AssistanceRequestSchema,
  RequestCounter,
  RequestCounterSchema,
} from './schemas/assistance.schema';

@Module({
  imports: [
    AppConfigModule,
    MongodbModule.forService('MONGODB_ASSISTANCE_URI'),
    MongooseModule.forFeature([
      { name: AssistanceProgram.name, schema: AssistanceProgramSchema },
      { name: AssistanceRequest.name, schema: AssistanceRequestSchema },
      { name: RequestCounter.name, schema: RequestCounterSchema },
    ]),
  ],
  controllers: [AssistanceController],
  providers: [
    AssistanceService,
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
export class AssistanceModule {}
