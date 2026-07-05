import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { Server, Socket } from 'socket.io';
import { AppConfigService } from '@app/common';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';

interface SosSocketData {
  userId: string;
  tenantKey: string;
}

/**
 * Live SOS location stream (Reference §5.5): the app authenticates the WS
 * handshake with its JWT + tenant header, then emits sos:location events;
 * each fix is persisted and fanned out to that tenant's dispatch room.
 * Degraded mode (no socket) falls back to the HTTP location endpoint,
 * and below that to native dial — both client-side.
 */
@WebSocketGateway({ namespace: '/sos', cors: { origin: true, credentials: true } })
export class SosGateway implements OnGatewayConnection {
  private readonly logger = new Logger(SosGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    @Inject(SERVICE_CLIENT('emergency')) private readonly emergency: ClientProxy,
    @Inject(SERVICE_CLIENT('tenancy')) private readonly tenancy: ClientProxy,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token =
        (socket.handshake.auth?.token as string) ??
        (socket.handshake.headers.authorization ?? '').replace('Bearer ', '');
      const tenantKey =
        (socket.handshake.auth?.tenant as string) ??
        (socket.handshake.headers['x-tenant-id'] as string);
      if (!token || !tenantKey) throw new Error('missing token/tenant');
      const payload = this.jwt.verify<{ sub: string; tenantId: string }>(token, {
        secret: this.config.require('JWT_ACCESS_SECRET'),
      });
      (socket.data as SosSocketData).userId = payload.sub;
      (socket.data as SosSocketData).tenantKey = tenantKey;
      await socket.join(`dispatch:${payload.tenantId}`);
    } catch {
      socket.disconnect(true);
    }
  }

  @SubscribeMessage('sos:location')
  async onLocation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { session_id: string; lat: number; lng: number },
  ): Promise<{ received: boolean }> {
    const { userId, tenantKey } = socket.data as SosSocketData;
    try {
      const tenant = await callService<{ tenantId: string }>(this.tenancy, 'tenancy.resolve', {
        key: tenantKey,
      });
      await callService(this.emergency, 'emergency.sos.location', {
        tenant,
        data: { user_id: userId, session_id: body.session_id, lat: body.lat, lng: body.lng },
      });
      // Fan out to the tenant's dispatch console room.
      this.server.to(`dispatch:${tenant.tenantId}`).emit('sos:location:update', {
        session_id: body.session_id,
        lat: body.lat,
        lng: body.lng,
        at: new Date().toISOString(),
      });
      return { received: true };
    } catch (e) {
      this.logger.warn(`sos:location failed: ${(e as Error).message}`);
      return { received: false };
    }
  }
}
