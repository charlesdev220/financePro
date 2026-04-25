import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CurrencyApiService } from '../../../core/services/currency-api.service';

describe('CurrencyApiService', () => {
  let service: CurrencyApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CurrencyApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CurrencyApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    // Reset cache between tests — `as any` necesario para acceder a propiedad privada en test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).cache.clear();
  });

  // REQ-01 sc1: tasa disponible en API
  it('should return rate from API when not cached', done => {
    service.getRate('USD', 'EUR').subscribe(rate => {
      expect(rate).toBe(0.92);
      done();
    });
    const req = httpMock.expectOne(r => r.url.includes('pair/USD/EUR'));
    req.flush({ result: 'success', conversion_rate: 0.92 });
  });

  // REQ-01 sc2: API no disponible — fallback 1:1
  it('should return 1 when API fails (fallback)', done => {
    service.getRate('USD', 'EUR').subscribe(rate => {
      expect(rate).toBe(1);
      done();
    });
    const req = httpMock.expectOne(r => r.url.includes('pair/USD/EUR'));
    req.error(new ProgressEvent('Network Error'));
  });

  // REQ-01 sc3: misma divisa origen y destino — retorna 1 sin llamar API
  it('should return 1 without HTTP call when from === to', done => {
    service.getRate('EUR', 'EUR').subscribe(rate => {
      expect(rate).toBe(1);
      done();
    });
    httpMock.expectNone(r => r.url.includes('pair'));
  });

  // REQ-02 sc1: caché vigente (< 1 hora) — no llama API
  it('should return cached rate without HTTP call when cache is fresh', done => {
    // Pre-populate cache — `as any` para acceder a propiedad privada en test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).cache.set('USD_EUR', { rate: 0.88, timestamp: Date.now() });
    service.getRate('USD', 'EUR').subscribe(rate => {
      expect(rate).toBe(0.88);
      done();
    });
    httpMock.expectNone(r => r.url.includes('pair/USD/EUR'));
  });

  // REQ-02 sc2: caché expirada (> 1 hora) — llama API y actualiza caché
  it('should call API when cache is stale (> 1 hour)', done => {
    const oneHourAgo = Date.now() - 61 * 60 * 1000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).cache.set('USD_EUR', { rate: 0.85, timestamp: oneHourAgo });
    service.getRate('USD', 'EUR').subscribe(rate => {
      expect(rate).toBe(0.92);
      done();
    });
    const req = httpMock.expectOne(r => r.url.includes('pair/USD/EUR'));
    req.flush({ result: 'success', conversion_rate: 0.92 });
  });
});
