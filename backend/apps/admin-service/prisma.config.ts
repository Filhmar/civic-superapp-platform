import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

loadEnv({ path: path.resolve(__dirname, '../../.env.development') });
loadEnv({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'prisma/migrations'),
  },
  datasource: {
    url: process.env.ADMIN_SERVICE_DATABASE_URL ?? '',
  },
});
