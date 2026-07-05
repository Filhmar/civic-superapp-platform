import { Module } from '@nestjs/common';
import { AppConfigModule } from '@app/common';
import { TenancyController } from './tenancy.controller';
import { TenancyService } from './services/tenancy.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [AppConfigModule],
  controllers: [TenancyController],
  providers: [TenancyService, PrismaService],
})
export class TenancyModule {}
