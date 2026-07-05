import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigModule } from '@app/common';
import { MongodbModule } from '@app/mongodb';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import {
  Favorite,
  FavoriteSchema,
  Poi,
  PoiSchema,
  RecentSearch,
  RecentSearchSchema,
  TransportRoute,
  TransportRouteSchema,
} from './schemas/places.schema';

@Module({
  imports: [
    AppConfigModule,
    MongodbModule.forService('MONGODB_PLACES_URI'),
    MongooseModule.forFeature([
      { name: Poi.name, schema: PoiSchema },
      { name: Favorite.name, schema: FavoriteSchema },
      { name: TransportRoute.name, schema: TransportRouteSchema },
      { name: RecentSearch.name, schema: RecentSearchSchema },
    ]),
  ],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
