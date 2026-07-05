import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

loadEnv({ path: path.resolve(__dirname, '../../.env.development') });
loadEnv({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'prisma/migrations'),
    seed: 'ts-node -P tsconfig.scripts.json apps/tenancy-service/prisma/seed.ts',
  },
  datasource: {
    url: process.env.TENANCY_SERVICE_DATABASE_URL ?? '',
  },
});
