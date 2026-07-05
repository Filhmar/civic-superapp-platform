import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigModule } from '@app/common';
import { AdminController } from './admin.controller';
import { AdminAuthService } from './admin-auth.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [AppConfigModule, JwtModule.register({})],
  controllers: [AdminController],
  providers: [AdminAuthService, PrismaService],
})
export class AdminModule {}
