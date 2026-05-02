import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { firstValueFrom } from 'rxjs';
import { CurrencyApiService } from '@core/services/currency-api.service';

describe('CurrencyApiService', () => {
  let spectator: SpectatorService<CurrencyApiService>;
  let httpMock: HttpTestingController;

  const createService = createServiceFactory({
    service: CurrencyApiService,
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });

  beforeEach(() => {
    spectator = createService();
    httpMock = spectator.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    // Reset cache between tests — `as any` necesario para acceder a propiedad privada en test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (spectator.service as any).cache.clear();
  });

  // REQ-01 sc1: tasa disponible en API
  it('should return rate from API when not cached', async () => {
    const ratePromise = firstValueFrom(spectator.service.getRate('USD', 'EUR'));
    const req = httpMock.expectOne(r => r.url.includes('pair/USD/EUR'));
    req.flush({ result: 'success', conversion_rate: 0.92 });
    expect(await ratePromise).toBe(0.92);
  });

  // REQ-01 sc2: API no disponible — fallback 1:1
  it('should return 1 when API fails (fallback)', async () => {
    const ratePromise = firstValueFrom(spectator.service.getRate('USD', 'EUR'));
    const req = httpMock.expectOne(r => r.url.includes('pair/USD/EUR'));
    req.error(new ProgressEvent('Network Error'));
    expect(await ratePromise).toBe(1);
  });

  // REQ-01 sc3: misma divisa origen y destino — retorna 1 sin llamar API
  it('should return 1 without HTTP call when from === to', async () => {
    const rate = await firstValueFrom(spectator.service.getRate('EUR', 'EUR'));
    httpMock.expectNone(r => r.url.includes('pair'));
    expect(rate).toBe(1);
  });

  // REQ-02 sc1: caché vigente (< 1 hora) — no llama API
  it('should return cached rate without HTTP call when cache is fresh', async () => {
    // Pre-populate cache — `as any` para acceder a propiedad privada en test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (spectator.service as any).cache.set('USD_EUR', { rate: 0.88, timestamp: Date.now() });
    const rate = await firstValueFrom(spectator.service.getRate('USD', 'EUR'));
    httpMock.expectNone(r => r.url.includes('pair/USD/EUR'));
    expect(rate).toBe(0.88);
  });

  // REQ-02 sc2: caché expirada (> 1 hora) — llama API y actualiza caché
  it('should call API when cache is stale (> 1 hour)', async () => {
    const oneHourAgo = Date.now() - 61 * 60 * 1000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (spectator.service as any).cache.set('USD_EUR', { rate: 0.85, timestamp: oneHourAgo });
    const ratePromise = firstValueFrom(spectator.service.getRate('USD', 'EUR'));
    const req = httpMock.expectOne(r => r.url.includes('pair/USD/EUR'));
    req.flush({ result: 'success', conversion_rate: 0.92 });
    expect(await ratePromise).toBe(0.92);
  });

  describe('isCacheValid()', () => {
    it('returns true if from === to', () => {
      expect(spectator.service.isCacheValid('EUR', 'EUR')).toBe(true);
    });

    it('returns false if not in cache', () => {
      expect(spectator.service.isCacheValid('USD', 'JPY')).toBe(false);
    });

    it('returns true if fresh in cache', () => {
      (spectator.service as any).cache.set('USD_JPY', { rate: 150, timestamp: Date.now() });
      expect(spectator.service.isCacheValid('USD', 'JPY')).toBe(true);
    });

    it('returns false if stale in cache', () => {
      const longAgo = Date.now() - 10 * 60 * 60 * 1000;
      (spectator.service as any).cache.set('USD_JPY', { rate: 150, timestamp: longAgo });
      expect(spectator.service.isCacheValid('USD', 'JPY')).toBe(false);
    });
  });
});
