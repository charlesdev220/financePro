import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppsScriptService } from './apps-script.service';

/**
 * Phase 1: environment.appsScriptUrl = '' (placeholder).
 * post() returns EMPTY — no HTTP calls should fire.
 */
describe('AppsScriptService (unconfigured environment)', () => {
  let service: AppsScriptService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AppsScriptService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('post() returns EMPTY when appsScriptUrl is not configured', (done) => {
    let emitted = false;
    service.post('addTransaction', { amount: 100 }).subscribe({
      next: () => { emitted = true; },
      complete: () => {
        expect(emitted).toBeFalse();
        done();
      },
    });
  });

  it('post() returns EMPTY regardless of action or payload', (done) => {
    let emitted = false;
    service.post('updateBudget', { categoryId: 'cat-1', period: '2026-04' }).subscribe({
      next: () => { emitted = true; },
      complete: () => {
        expect(emitted).toBeFalse();
        done();
      },
    });
  });
});
