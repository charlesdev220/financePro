import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SheetsApiService } from './sheets-api.service';
import { EMPTY } from 'rxjs';

/**
 * Phase 1: environment.spreadsheetId = '' (placeholder).
 * All methods return EMPTY — no HTTP calls should fire.
 */
describe('SheetsApiService (unconfigured environment)', () => {
  let service: SheetsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SheetsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getRange() returns EMPTY when spreadsheetId is not configured', (done) => {
    let emitted = false;
    service.getRange('TRANSACTIONS!A:O').subscribe({
      next: () => { emitted = true; },
      complete: () => {
        expect(emitted).toBeFalse();
        done();
      },
    });
  });

  it('appendRow() returns EMPTY when spreadsheetId is not configured', (done) => {
    let emitted = false;
    service.appendRow('TRANSACTIONS!A:O', [['row']]).subscribe({
      next: () => { emitted = true; },
      complete: () => {
        expect(emitted).toBeFalse();
        done();
      },
    });
  });

  it('updateRow() returns EMPTY when spreadsheetId is not configured', (done) => {
    let emitted = false;
    service.updateRow('TRANSACTIONS!A2', [['updated']]).subscribe({
      next: () => { emitted = true; },
      complete: () => {
        expect(emitted).toBeFalse();
        done();
      },
    });
  });

  it('deleteRow() returns EMPTY when spreadsheetId is not configured', (done) => {
    let emitted = false;
    service.deleteRow('TRANSACTIONS!A2:O2').subscribe({
      next: () => { emitted = true; },
      complete: () => {
        expect(emitted).toBeFalse();
        done();
      },
    });
  });
});
