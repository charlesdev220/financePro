import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';

describe('CurrencyFormatPipe', () => {
  let pipe: CurrencyFormatPipe;

  beforeEach(() => {
    pipe = new CurrencyFormatPipe();
  });

  it('should format a positive number with EUR', () => {
    const result = pipe.transform(1234.56, 'EUR', 'es-AR');
    expect(result).toContain('1.234');
    expect(result).toContain('56');
  });

  it('should format zero', () => {
    const result = pipe.transform(0, 'EUR');
    expect(result).toBeTruthy();
  });

  it('should return "—" for null/undefined', () => {
    expect(pipe.transform(null as any, 'EUR')).toBe('—');
    expect(pipe.transform(NaN, 'EUR')).toBe('—');
  });

  it('should format different currencies', () => {
    const eur = pipe.transform(100, 'EUR');
    const usd = pipe.transform(100, 'USD');
    expect(eur).not.toBe(usd); // Different currency symbols
  });
});
