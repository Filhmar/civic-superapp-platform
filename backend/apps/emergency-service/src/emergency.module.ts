import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigModule } from '@app/common';
import { MongodbModule } from '@app/mongodb';
import { EmergencyController } from './emergency.controller';
import { EmergencyService } from './emergency.service';
import {
  Hotline,
  HotlineSchema,
  SosCounter,
  SosCounterSchema,
  SosSession,
  SosSessionSchema,
} from './schemas/emergency.schema';

@Module({
  imports: [
    AppConfigModule,
    MongodbModule.forService('MONGODB_EMERGENCY_URI'),
    MongooseModule.forFeature([
      { name: Hotline.name, schema: HotlineSchema },
      { name: SosSession.name, schema: SosSessionSchema },
      { name: SosCounter.name, schema: SosCounterSchema },
    ]),
  ],
  controllers: [EmergencyController],
  providers: [EmergencyService],
})
export class EmergencyModule {}
