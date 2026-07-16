import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigModule } from '@app/common';
import { MongodbModule } from '@app/mongodb';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { GeoFeature, GeoFeatureSchema } from './schemas/geo-feature.schema';

@Module({
  imports: [
    AppConfigModule,
    MongodbModule.forService('MONGODB_GEO_URI'),
    MongooseModule.forFeature([{ name: GeoFeature.name, schema: GeoFeatureSchema }]),
  ],
  controllers: [GeoController],
  providers: [GeoService],
})
export class GeoModule {}
