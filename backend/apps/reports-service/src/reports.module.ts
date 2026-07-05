import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AppConfigModule, AppConfigService } from '@app/common';
import { MongodbModule } from '@app/mongodb';
import { ReportsController } from './reports.controller';
import { NOTIFICATION_CLIENT, ReportsService } from './reports.service';
import {
  ReportCategory,
  ReportCategorySchema,
  Ticket,
  TicketCounter,
  TicketCounterSchema,
  TicketSchema,
} from './schemas/ticket.schema';

@Module({
  imports: [
    AppConfigModule,
    MongodbModule.forService('MONGODB_REPORTS_URI'),
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: TicketCounter.name, schema: TicketCounterSchema },
      { name: ReportCategory.name, schema: ReportCategorySchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
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
export class ReportsModule {}
