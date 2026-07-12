import { IntegrationController } from './integration.controller';
import { WeatherService } from './weather.service';
import { UsappDriver } from './usapp/usapp.driver';
import {
  DeliveryRateLimitedError,
  DeliveryUnavailableError,
  RecipientNotRegisteredError,
} from './usapp/usapp.errors';

function makeController(send: jest.Mock) {
  const usapp = { send } as unknown as UsappDriver;
  return new IntegrationController({} as WeatherService, usapp);
}

describe('integration.usapp.send', () => {
  it('returns { delivered: true } on success', async () => {
    const ctrl = makeController(jest.fn().mockResolvedValue(undefined));
    await expect(ctrl.usappSend({ phone: '+639171234567', content: 'hi' })).resolves.toEqual({
      delivered: true,
    });
  });

  it('maps NotRegistered → 409', async () => {
    const ctrl = makeController(jest.fn().mockRejectedValue(new RecipientNotRegisteredError()));
    await expect(ctrl.usappSend({ phone: '+639990000000', content: 'x' })).rejects.toMatchObject({
      error: { statusCode: 409 },
    });
  });

  it('maps RateLimited → 503', async () => {
    const ctrl = makeController(jest.fn().mockRejectedValue(new DeliveryRateLimitedError()));
    await expect(ctrl.usappSend({ phone: '+639171234567', content: 'x' })).rejects.toMatchObject({
      error: { statusCode: 503 },
    });
  });

  it('maps Unavailable → 502', async () => {
    const ctrl = makeController(jest.fn().mockRejectedValue(new DeliveryUnavailableError()));
    await expect(ctrl.usappSend({ phone: '+639171234567', content: 'x' })).rejects.toMatchObject({
      error: { statusCode: 502 },
    });
  });
});
