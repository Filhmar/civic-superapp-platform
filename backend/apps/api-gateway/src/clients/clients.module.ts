import { Global, Module, Provider } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AppConfigModule, AppConfigService, SERVICE_ENV_PREFIX, ServiceName } from '@app/common';

export const SERVICE_CLIENT = (name: ServiceName) => `SERVICE_CLIENT_${name}`;

const clientProviders: Provider[] = (Object.keys(SERVICE_ENV_PREFIX) as ServiceName[]).map(
  (name) => ({
    provide: SERVICE_CLIENT(name),
    inject: [AppConfigService],
    useFactory: (config: AppConfigService): ClientProxy => {
      const { host, port } = config.tcpEndpoint(name);
      return ClientProxyFactory.create({
        transport: Transport.TCP,
        options: { host, port },
      });
    },
  }),
);

@Global()
@Module({
  imports: [AppConfigModule],
  providers: clientProviders,
  exports: clientProviders.map((p) => (p as { provide: string }).provide),
})
export class ClientsModule {}
