import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigService, ConfigSchema } from '@app/common';

/** Connects a Mongo-backed service to its own database via its MONGODB_*_URI var. */
@Module({})
export class MongodbModule {
  static forService(uriKey: keyof ConfigSchema): DynamicModule {
    return {
      module: MongodbModule,
      imports: [
        MongooseModule.forRootAsync({
          inject: [AppConfigService],
          useFactory: (config: AppConfigService) => ({
            uri: config.require(uriKey) as string,
          }),
        }),
      ],
      exports: [MongooseModule],
    };
  }
}
