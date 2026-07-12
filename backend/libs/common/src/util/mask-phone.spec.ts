import { maskPhone } from './mask-phone';

describe('maskPhone', () => {
  it('keeps the +63 prefix and last 4 digits, masks the middle', () => {
    expect(maskPhone('+639171234567')).toBe('+63••••••4567');
  });
  it('fully masks very short strings', () => {
    expect(maskPhone('123')).toBe('••••');
  });
});
