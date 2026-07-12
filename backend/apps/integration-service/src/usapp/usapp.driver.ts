import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService, maskPhone } from '@app/common';
import {
  DeliveryRateLimitedError,
  DeliveryUnavailableError,
  RecipientNotRegisteredError,
} from './usapp.errors';

/**
 * Sole Usapp HTTP client for the platform. Invariants: never log `content`
 * (it carries the OTP code), never retry, always time out.
 */
@Injectable()
export class UsappDriver {
  private readonly logger = new Logger(UsappDriver.name);

  constructor(private readonly config: AppConfigService) {}

  async send(phone: string, content: string): Promise<void> {
    const base = this.config.require('USAPP_BASE_URL').replace(/\/+$/, '');
    let response: Response;
    try {
      response = await fetch(`${base}/api/v1/messages/send`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.config.require('USAPP_API_KEY'),
        },
        body: JSON.stringify({ recipientPhone: phone, content, format: 'plain' }),
        signal: AbortSignal.timeout(this.config.get('USAPP_TIMEOUT_MS')),
      });
    } catch (err) {
      this.logger.error(
        `Usapp unreachable for ${maskPhone(phone)}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new DeliveryUnavailableError();
    }

    if (response.ok) return;

    if (response.status === 404) throw new RecipientNotRegisteredError();

    if (response.status === 429) {
      this.logger.warn(`Usapp rate-limited this tenant sending to ${maskPhone(phone)}`);
      throw new DeliveryRateLimitedError();
    }

    if (response.status === 401 || response.status === 403) {
      this.logger.error(
        `Usapp rejected this tenant (${response.status}) sending to ${maskPhone(phone)}. ` +
          `Check USAPP_API_KEY, that the key is neither revoked nor expired, that the tenant ` +
          `is active, and that this host's egress IP is in the tenant ipAllowlist.`,
      );
      throw new DeliveryUnavailableError();
    }

    this.logger.error(`Usapp answered ${response.status} sending to ${maskPhone(phone)}`);
    throw new DeliveryUnavailableError();
  }
}
