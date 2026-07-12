import { NotificationService } from './notification.service';
import { TenantContext } from '@app/common';
import { of, throwError } from 'rxjs';
import type { Model } from 'mongoose';

function baseTenant(push: 'usapp' | 'none'): TenantContext {
  return {
    tenantId: 'ph-test-city',
    kind: 'city',
    status: 'active',
    ticketPrefix: 'TST',
    residentIdPrefix: 'TST',
    modules: {} as TenantContext['modules'],
    pushChannel: push,
    configVersion: 1,
  };
}

function makeModels() {
  const notifications = { create: jest.fn().mockResolvedValue({ _id: 'n1' }) } as unknown as Model<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const audit = { create: jest.fn().mockResolvedValue({}) } as unknown as Model<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  return { notifications, audit };
}

describe('NotificationService.create — Usapp push fan-out', () => {
  it('does not push when tenant.pushChannel is not usapp', async () => {
    const { notifications, audit } = makeModels();
    const integration = { send: jest.fn() };
    const identity = { send: jest.fn() };
    const svc = new NotificationService(notifications, audit, integration as never, identity as never);

    await svc.create(baseTenant('none'), 'u1', 'Title', 'Body', 'egov');
    await new Promise((r) => setImmediate(r)); // let best-effort microtask settle

    expect(identity.send).not.toHaveBeenCalled();
    expect(integration.send).not.toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalledTimes(1);
  });

  it('resolves phone then sends via Usapp when pushChannel=usapp', async () => {
    const { notifications, audit } = makeModels();
    const integration = { send: jest.fn().mockReturnValue(of({ delivered: true })) };
    const identity = { send: jest.fn().mockReturnValue(of({ phone_number: '+639171234567' })) };
    const svc = new NotificationService(notifications, audit, integration as never, identity as never);

    await svc.create(baseTenant('usapp'), 'u1', 'Title', 'Body', 'egov');
    await new Promise((r) => setImmediate(r));

    expect(identity.send).toHaveBeenCalledWith({ cmd: 'identity.phone.resolve' }, expect.objectContaining({ data: { user_id: 'u1' } }));
    expect(integration.send).toHaveBeenCalledWith(
      { cmd: 'integration.usapp.send' },
      { phone: '+639171234567', content: 'Title\nBody' },
    );
  });

  it('skips push for a guest with no phone', async () => {
    const { notifications, audit } = makeModels();
    const integration = { send: jest.fn() };
    const identity = { send: jest.fn().mockReturnValue(of({ phone_number: null })) };
    const svc = new NotificationService(notifications, audit, integration as never, identity as never);

    await svc.create(baseTenant('usapp'), 'guest1', 'T', 'B', 'egov');
    await new Promise((r) => setImmediate(r));

    expect(integration.send).not.toHaveBeenCalled();
  });

  it('swallows Usapp failures — in-app write still succeeds', async () => {
    const { notifications, audit } = makeModels();
    const integration = { send: jest.fn().mockReturnValue(throwError(() => ({ error: { statusCode: 404 } }))) };
    const identity = { send: jest.fn().mockReturnValue(of({ phone_number: '+639990000000' })) };
    const svc = new NotificationService(notifications, audit, integration as never, identity as never);

    const res = await svc.create(baseTenant('usapp'), 'u1', 'T', 'B', 'egov');
    await new Promise((r) => setImmediate(r));

    expect(res).toEqual({ id: 'n1' }); // create resolved normally
  });
});
