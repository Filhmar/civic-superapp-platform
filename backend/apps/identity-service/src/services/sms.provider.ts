import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@app/common';

/**
 * SMS dispatch adapter. Which provider a tenant uses is config data
 * (integrations.sms); 'mock' logs the code for local development.
 */
@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);

  constructor(private readonly config: AppConfigService) {}

  async sendOtp(phoneNumber: string, code: string, provider: string): Promise<void> {
    if (this.config.get('SMS_PROVIDER') === 'mock' || this.config.get('NODE_ENV') !== 'production') {
      this.logger.log(`[mock-sms via ${provider}] OTP for ${phoneNumber}: ${code}`);
      return;
    }
    // Real aggregator adapters (e.g. Semaphore) plug in here per tenant config.
    throw new Error(`SMS provider '${provider}' not configured`);
  }
}
