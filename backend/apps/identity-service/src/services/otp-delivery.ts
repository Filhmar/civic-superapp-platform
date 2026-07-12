import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AppConfigService, maskPhone, rpcError } from '@app/common';

export const INTEGRATION_CLIENT = 'INTEGRATION_CLIENT';

/**
 * OTP delivery port. Driver is chosen by OTP_DELIVERY_DRIVER (global env):
 *  - mock  → log the code (development only; forbidden in production at boot).
 *  - usapp → delegate to integration-service, which maps failures to 409/503/502.
 */
@Injectable()
export class OtpDelivery {
  private readonly logger = new Logger(OtpDelivery.name);

  constructor(
    private readonly config: AppConfigService,
    @Inject(INTEGRATION_CLIENT) private readonly integration: ClientProxy,
  ) {}

  async send(phoneNumber: string, code: string): Promise<void> {
    if (this.config.get('OTP_DELIVERY_DRIVER') === 'mock') {
      this.logger.log(`[mock-otp] ${maskPhone(phoneNumber)}: ${code}`);
      return;
    }
    const content = `Your verification code is ${code}. Valid for ${this.config.get('OTP_EXPIRY_MINUTES')} minutes.`;
    try {
      await firstValueFrom(
        this.integration.send({ cmd: 'integration.usapp.send' }, { phone: phoneNumber, content }),
      );
    } catch (e) {
      // Re-wrap the integration RpcException as a fresh rpcError so it propagates
      // cleanly through this service to the gateway (409/503/502 preserved).
      const shape = (e as { error?: { statusCode?: number; message?: string }; statusCode?: number; message?: string });
      const status = shape.error?.statusCode ?? shape.statusCode ?? 502;
      const message = shape.error?.message ?? shape.message ?? 'OTP delivery failed';
      rpcError(status, message);
    }
  }
}
